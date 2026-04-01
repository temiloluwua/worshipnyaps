/*
  # Reload schema cache for events table

  The description_template column exists but PostgREST's schema cache
  hasn't picked it up. This migration adds a comment to force a schema
  cache reload.
*/

COMMENT ON COLUMN events.description_template IS 'Optional structured description template for the event';
