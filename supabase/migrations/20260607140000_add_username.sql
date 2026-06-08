/*
  # Choose-your-username

  - users.username: lowercase, alphanumeric + underscore, 3-20 chars, unique
  - Backfill: derive from email prefix + a unique suffix so existing users
    get something readable they can change later.
  - Trigger: handle_new_user now picks up raw_user_meta_data->>'username'
    when present and falls back to the derived value otherwise.
  - RPC: is_username_available() lets the signup form check uniqueness
    before submitting (and bypasses RLS on a tiny existence query).
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text;

-- ----------------------------------------------------------------------------
-- Backfill: derive from email prefix, sanitize, attach unique suffix
-- ----------------------------------------------------------------------------
WITH derived AS (
  SELECT
    id,
    LEFT(
      LOWER(REGEXP_REPLACE(COALESCE(NULLIF(SPLIT_PART(email, '@', 1), ''), 'user'), '[^a-z0-9_]', '', 'gi'))
      || '_'
      || SUBSTR(id::text, 1, 4),
      20
    ) AS candidate
  FROM public.users
  WHERE username IS NULL
)
UPDATE public.users u
SET username = CASE
  WHEN LENGTH(d.candidate) < 3 THEN 'user_' || SUBSTR(u.id::text, 1, 8)
  ELSE d.candidate
END
FROM derived d
WHERE u.id = d.id;

-- ----------------------------------------------------------------------------
-- Constraints (only if not already present)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_username_format'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_format
      CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- ----------------------------------------------------------------------------
-- RPC for client-side availability check
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = LOWER(p_username)
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- Trigger: handle_new_user now also captures username
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback_username text;
  raw_username text;
BEGIN
  raw_username := LOWER(NULLIF(NEW.raw_user_meta_data->>'username', ''));

  fallback_username := LEFT(
    LOWER(REGEXP_REPLACE(COALESCE(NULLIF(SPLIT_PART(NEW.email, '@', 1), ''), 'user'), '[^a-z0-9_]', '', 'gi'))
    || '_'
    || SUBSTR(NEW.id::text, 1, 4),
    20
  );
  IF LENGTH(fallback_username) < 3 THEN
    fallback_username := 'user_' || SUBSTR(NEW.id::text, 1, 8);
  END IF;

  INSERT INTO public.users (id, email, name, username)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.email, ''), 'user-' || substr(NEW.id::text, 1, 8) || '@placeholder.worshipnyaps.com'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'Member'
    ),
    COALESCE(raw_username, fallback_username)
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
