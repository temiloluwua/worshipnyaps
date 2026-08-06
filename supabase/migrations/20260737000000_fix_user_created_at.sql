/*
  # Correct users.created_at to the real signup time

  public.users.created_at can be wrong for rows created by a backfill (they got
  the migration-run time, not the account's real creation time), which makes the
  profile "Joined <month year>" line inaccurate. auth.users.created_at is the
  source of truth for when the account was actually created — sync from it.

  One-time correction; new rows created going forward already default to their
  insert time (= signup time).
*/

UPDATE public.users u
SET created_at = au.created_at
FROM auth.users au
WHERE au.id = u.id
  AND u.created_at IS DISTINCT FROM au.created_at;
