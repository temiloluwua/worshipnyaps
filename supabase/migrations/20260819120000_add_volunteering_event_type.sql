/*
  # Add 'volunteering' event type

  Extends the events.event_type CHECK constraint to allow 'volunteering'
  alongside the existing bible_study / yap / church / evangelism values, so
  hosts can create volunteering gatherings. Idempotent.
*/

DO $$
BEGIN
  ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
  ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN ('bible_study', 'yap', 'church', 'evangelism', 'volunteering'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'skip events_event_type_check: %', SQLERRM;
END $$;
