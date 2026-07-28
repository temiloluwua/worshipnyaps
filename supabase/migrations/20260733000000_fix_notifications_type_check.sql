/*
  # Re-apply the complete notifications type CHECK

  The production DB was on an older, narrower notifications_type_check that
  rejected some types the app inserts (group/event/poll notifications), causing
  "violates check constraint notifications_type_check". Reset it to the full,
  current set of types (idempotent — safe to run anytime).
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
