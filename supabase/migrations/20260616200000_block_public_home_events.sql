/*
  # Home events can never be publicly listed

  Safety rule: an event hosted at someone's home must never be `public`
  visibility (which would put it on the open feed for anyone to find).
  HostEventModal coerces this on create, but the edit modal, the
  useEvents.updateEvent hook, and any direct PostgREST request could
  bypass the rule and expose a host's address.

  Fix: defense-in-depth with a CHECK constraint on `events`. We also
  block `address_visibility = 'public'` for home events — friends-only
  events already restrict who can see the listing, but a public address
  on top still hands the street address to every connection.

  Existing rows that violate the rule are fixed up first so the
  constraint can be added without NOT VALID.
*/

-- 1. Repair any existing rows that violate the rule.
UPDATE public.events
SET visibility = 'friends_only',
    address_visibility = 'attendees_only',
    is_private = false
WHERE location_type = 'home'
  AND (visibility = 'public' OR address_visibility = 'public');

-- 2. Forbid the bad combinations going forward.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_home_not_public_check;
ALTER TABLE public.events ADD CONSTRAINT events_home_not_public_check
  CHECK (
    location_type IS DISTINCT FROM 'home'
    OR (
      visibility <> 'public'
      AND COALESCE(address_visibility, 'attendees_only') <> 'public'
    )
  );

NOTIFY pgrst, 'reload schema';
