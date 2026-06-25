/*
  # Trigger that asks the send-push Edge Function to deliver APNs pushes

  ## Why
  In-app notifications already land in public.notifications. To also surface
  them on a user's lock screen, we need to call the APNs HTTP/2 endpoint
  with a JWT signed by our .p8 key. That happens in the send-push Edge
  Function. This migration fires that function from a post-INSERT trigger.

  ## What
  - Enables pg_net (idempotent) so SQL can do HTTPS calls.
  - Defines public.dispatch_push_for_notification() — reads the function URL
    and service-role auth header from per-database settings, POSTs the new
    notification_id to the Edge Function.
  - AFTER INSERT trigger on public.notifications fires the function.
  - The trigger no-ops cleanly if the settings aren't configured yet, so it
    won't break inserts before you wire up the function URL.

  ## One-time setup (run AFTER deploying the Edge Function):
    ALTER DATABASE postgres
      SET app.push_function_url = 'https://<project-ref>.supabase.co/functions/v1/send-push';
    ALTER DATABASE postgres
      SET app.push_function_auth = 'Bearer <SERVICE_ROLE_KEY>';
  Then disconnect/reconnect once so the new settings load.
*/

CREATE EXTENSION IF NOT EXISTS pg_net;

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
  v_url := current_setting('app.push_function_url', true);
  v_auth := current_setting('app.push_function_auth', true);

  -- If the install hasn't been pointed at the Edge Function yet, do nothing.
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

DROP TRIGGER IF EXISTS trg_dispatch_push ON public.notifications;
CREATE TRIGGER trg_dispatch_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_push_for_notification();
