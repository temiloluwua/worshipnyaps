/*
  # Turn on push dispatch (hardcode the send-push URL in the trigger fn)

  The AFTER-INSERT trigger on public.notifications (20260622000000) only POSTs to
  the send-push Edge Function when app.push_function_url is set; otherwise it
  no-ops. That GUC was never configured, so no APNs pushes were ever sent even
  though the function is deployed and its APNs secrets are present.

  We can't set the GUC from a migration — on Supabase the migration role isn't a
  superuser, so `ALTER DATABASE ... SET app.push_function_url` fails with 42501.
  The URL is not a secret (it's the public Functions endpoint), so we bake it
  into the trigger function as a fallback. A superuser-set GUC still wins if one
  is ever configured via the dashboard.

  No auth header is needed: send-push is deployed with verify_jwt = false.
*/
CREATE OR REPLACE FUNCTION public.dispatch_push_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_auth text;
BEGIN
  -- Prefer a GUC override if present; otherwise fall back to the known URL.
  v_url := COALESCE(
    NULLIF(current_setting('app.push_function_url', true), ''),
    'https://pobqjupcbhhkvparuszr.supabase.co/functions/v1/send-push'
  );
  v_auth := current_setting('app.push_function_auth', true);

  IF v_url IS NULL OR v_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', COALESCE(v_auth, '')
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the original INSERT on a push-delivery failure.
  RAISE WARNING 'dispatch_push_for_notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
