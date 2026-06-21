/*
  # Allow event_cancelled and event_postponed notification types

  EventDetailView.cancelEvent and EventDetailView.postponeEvent both
  insert notifications with these type values, but the
  notifications_type_check constraint set up in 20260613160000 didn't
  include them — so the host-cancel and host-postpone flows fail with:
    "new row for relation 'notifications' violates check constraint
     'notifications_type_check'"

  Adding both to the allowed set.
*/

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'general', 'event_reminder', 'connection_request', 'connection_accepted',
    'volunteer_opportunity', 'event_update', 'event', 'comment',
    'rsvp', 'dm', 'role_request', 'cohost_added',
    'event_cancelled', 'event_postponed'
  ));

NOTIFY pgrst, 'reload schema';
