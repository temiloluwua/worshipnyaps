/*
  # Add body + payload columns to notifications

  The notifications table was created in the dashboard with columns
  (user_id, type, title, message, event_id, is_read, ...), but the
  trigger functions added in 20260613160000 and the EventDetailView
  cancel/postpone code write to (title, body, payload). The mismatch
  meant every trigger-driven notification (connection_request,
  connection_accepted, comment, rsvp, dm, cohost_added,
  event_reminder, event_cancelled, event_postponed) silently failed
  with "column body does not exist".

  Adding the two missing columns. The UI was patched separately to
  read message ?? body so existing data and new data both render.
*/

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS payload jsonb;

NOTIFY pgrst, 'reload schema';
