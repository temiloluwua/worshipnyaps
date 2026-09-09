/*
  # Age bucket (is_adult)

  ## Why
  The age gate now asks a single yes/no question ("Are you 18 or older?")
  instead of collecting an exact date of birth. We store the answer as a
  boolean so routing (full app vs. read-only under-18 view) is exact and we
  never fabricate a birthdate.

  ## What
  - users.is_adult (boolean, nullable). NULL = not yet answered → the app shows
    the blocking age gate. Existing users who already recorded a real birthdate
    keep routing by that; they are not re-prompted.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_adult boolean;

NOTIFY pgrst, 'reload schema';
