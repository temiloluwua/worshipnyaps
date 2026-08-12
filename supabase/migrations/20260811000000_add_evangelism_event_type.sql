/*
  # Add 'evangelism' as a valid event_type

  The events.event_type CHECK constraint currently allows
  ('bible_study', 'yap', 'church'). We extend it to also allow 'evangelism'
  so people can host outreach / evangelism gatherings as a first-class event
  kind alongside Bible studies.
*/

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('bible_study', 'yap', 'church', 'evangelism'));

NOTIFY pgrst, 'reload schema';
