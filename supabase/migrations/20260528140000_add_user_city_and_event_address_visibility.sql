/*
  # Add user city + event address visibility

  ## Changes
  1. users.city — text, used by the Community page "Local" filter and by the
     profile city display. Backfilled to NULL; users can set it in profile edit
     or during onboarding.
  2. events.address_visibility — text enum {'general_area','attendees_only','public'}.
     Default 'public' for backwards compatibility with existing events.

  Idempotent.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS address_visibility text NOT NULL DEFAULT 'public'
    CHECK (address_visibility IN ('general_area', 'attendees_only', 'public'));

NOTIFY pgrst, 'reload schema';
