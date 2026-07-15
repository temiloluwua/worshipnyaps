/*
  # Complete the notifications type CHECK

  The notifications_type_check constraint on this database is missing several
  types the app now inserts (comment, rsvp, dm, role_request, cohost_added,
  event_update, connection_accepted, event_cancelled, event_postponed, etc.),
  so those inserts fail with a check-constraint violation. Reset it to the
  full set the app actually uses.
*/

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'general', 'event_reminder', 'connection_request', 'connection_accepted',
    'volunteer_opportunity', 'event_update', 'event', 'comment', 'rsvp', 'dm',
    'role_request', 'cohost_added', 'event_cancelled', 'event_postponed',
    'like', 'repost', 'mention', 'follow', 'report'
  ));

NOTIFY pgrst, 'reload schema';
