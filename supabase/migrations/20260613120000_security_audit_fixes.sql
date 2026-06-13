/*
  # Pre-launch security audit fixes

  Findings from the final pre-launch audit:

  1. CRITICAL — profiles storage bucket UPDATE/DELETE policies don't validate
     ownership. Any authenticated user can overwrite or delete another user's
     avatar / cover photo. Fix: require owner = auth.uid() on both ops.

  2. HIGH — users UPDATE policy lets a user change their own role field. A
     non-admin could PATCH their own row with role = 'admin' and become an
     admin. Fix: BEFORE UPDATE trigger that blocks role / is_approved changes
     for non-admins.

  Sentry URL sanitization (also flagged by the audit) is fixed in
  src/lib/sentry.ts in the same commit.
*/

-- ----------------------------------------------------------------------------
-- 1. profiles bucket: lock UPDATE / DELETE to file owner only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update their own profile images" ON storage.objects;
CREATE POLICY "Authenticated users can update their own profile images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profiles' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'profiles' AND owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete their own profile images" ON storage.objects;
CREATE POLICY "Authenticated users can delete their own profile images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profiles' AND owner = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. users: block self-promotion to admin / moderator via UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_unauthorized_user_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- If nothing sensitive changed, allow it
  IF NEW.role = OLD.role
     AND COALESCE(NEW.is_approved, false) = COALESCE(OLD.is_approved, false)
     AND COALESCE(NEW.is_verified, false) = COALESCE(OLD.is_verified, false) THEN
    RETURN NEW;
  END IF;

  -- Look up the caller's role and only allow admins to change these fields
  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can change role / is_approved / is_verified.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_block_unauthorized_field_changes ON public.users;
CREATE TRIGGER users_block_unauthorized_field_changes
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.block_unauthorized_user_field_changes();

NOTIFY pgrst, 'reload schema';
