/*
  # Drop NOT NULL on notifications.message

  The original notifications table had `message NOT NULL`, but the
  newer trigger functions and EventDetailView cancel/postpone writes
  only populate `body` (the column added in 20260620200000). Without
  this change, every trigger-driven insert (connection_request, dm,
  rsvp, comment, cohost_added, event_reminder, event_cancelled,
  event_postponed) still fails with:
    "null value in column 'message' of relation 'notifications'
     violates not-null constraint"

  NotificationsPage already falls back to body when message is null.
*/

ALTER TABLE public.notifications ALTER COLUMN message DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
