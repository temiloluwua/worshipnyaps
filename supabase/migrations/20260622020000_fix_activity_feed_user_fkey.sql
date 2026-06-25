/*
  # Add public.users FK so PostgREST can resolve activity_feed embeds

  Same root cause as 20260621020000_fix_dm_user_fkeys.sql — the column
  references auth.users (which PostgREST doesn't expose), so the embed
  users:user_id (...) returns null / 200 errors. Adding a second FK to
  public.users (1:1 mirror via the signup trigger) lets the explicit-FK
  hint work and unblocks the activity feed.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activity_feed_user_fkey'
      AND conrelid = 'public.activity_feed'::regclass
  ) THEN
    ALTER TABLE public.activity_feed
      ADD CONSTRAINT activity_feed_user_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Guard target_user_id since some deployments dropped the column.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activity_feed'
      AND column_name = 'target_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activity_feed_target_user_fkey'
      AND conrelid = 'public.activity_feed'::regclass
  ) THEN
    ALTER TABLE public.activity_feed
      ADD CONSTRAINT activity_feed_target_user_fkey
      FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
