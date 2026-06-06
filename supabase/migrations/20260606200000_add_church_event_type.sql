/*
  # Add 'church' as a valid event_type

  Existing CHECK constraint allows only ('bible_study', 'yap'). We extend
  it to also allow 'church' so people can host Sunday services, prayer
  meetings, and other church gatherings without forcing the structured
  Bible study fields.
*/

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('bible_study', 'yap', 'church'));

NOTIFY pgrst, 'reload schema';
