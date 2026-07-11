/*
  # Age verification (birthdate)

  ## Why
  App Store requires a mechanism to confirm a user meets the minimum age.
  We collect date of birth once (blocking gate in the app) and store it so
  we can enforce the 13+ minimum and never re-ask.

  ## What
  - users.birthdate (date, nullable). Null = not yet verified → the app shows
    the blocking age gate.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS birthdate date;

NOTIFY pgrst, 'reload schema';
