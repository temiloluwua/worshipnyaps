/*
  # Admin/moderator ban (eject) users

  Apple 1.2 requires the ability to eject a user who posts objectionable
  content. This adds a reversible "soft ban": banned users can no longer
  create any content (enforced server-side), and the app shows them a
  suspended screen. Existing content is left for moderators to remove
  individually via the reports queue.
*/

-- 1. Ban columns on users.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES public.users(id);

-- 2. Helper: is this user banned?
CREATE OR REPLACE FUNCTION public.is_banned(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND banned_at IS NOT NULL);
$$;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;

-- 3. Reject writes from banned users (server-side enforcement). Attached as a
--    BEFORE INSERT trigger so no existing policy needs to be rewritten.
CREATE OR REPLACE FUNCTION public.reject_banned_author()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_banned(auth.uid()) THEN
    RAISE EXCEPTION 'Your account has been suspended. Contact worshipnyaps@gmail.com.'
      USING ERRCODE = 'check_violation', HINT = 'ACCOUNT_BANNED';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'topics', 'comments', 'community_posts', 'direct_messages', 'events',
    'event_attendees', 'event_announcements', 'event_help_requests', 'connection_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_ban_check', t);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.reject_banned_author()',
        t || '_ban_check', t
      );
    END IF;
  END LOOP;
END $$;

-- 4. Admin/moderator ban + unban RPCs.
CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot ban yourself';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND role IN ('admin', 'moderator')) THEN
    RAISE EXCEPTION 'Cannot ban a moderator or admin';
  END IF;
  UPDATE public.users
  SET banned_at = now(), banned_reason = p_reason, banned_by = auth.uid()
  WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.users
  SET banned_at = NULL, banned_reason = NULL, banned_by = NULL
  WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
