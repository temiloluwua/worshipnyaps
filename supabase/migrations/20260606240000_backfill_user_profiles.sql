/*
  # Backfill missing public.users rows + harden handle_new_user

  The error `event_attendees_user_id_fkey` violation happens when an
  auth.users row exists (the user can sign in) but no matching
  public.users row was ever created — usually because of an Apple Sign In
  with null email, or because the on_auth_user_created trigger silently
  failed during a prior signup.

  Fix:
  1. Backfill any missing public.users from auth.users with safe defaults
     for null email / name.
  2. Replace handle_new_user with a version that:
     - Uses COALESCE for email + name (Apple often gives nulls)
     - ON CONFLICT DO NOTHING (don't blow up on retries)
     - Swallows unexpected errors and logs a WARNING so it can't block
       signup itself
*/

-- ----------------------------------------------------------------------------
-- 1. Backfill
-- ----------------------------------------------------------------------------
INSERT INTO public.users (id, email, name)
SELECT
  au.id,
  COALESCE(
    NULLIF(au.email, ''),
    'user-' || substr(au.id::text, 1, 8) || '@placeholder.worshipnyaps.com'
  ),
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'name', ''),
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(split_part(au.email, '@', 1), ''),
    'Member'
  )
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. Harden the trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.email, ''),
      'user-' || substr(NEW.id::text, 1, 8) || '@placeholder.worshipnyaps.com'
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'Member'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
