/*
  # Re-apply the full notifications_type_check (for real this time)

  Booking someone into a help role inserts a notification with type
  'role_request', which failed with "violates check constraint
  notifications_type_check". The earlier fix migrations (20260714000000,
  20260733000000) were marked applied during the 2026-08-11 migration-history
  reconciliation but the live constraint was actually still an older, narrower
  set that lacks 'role_request' (and likely other recent types).

  This is a brand-new migration version, so `db push` will genuinely run it and
  bring the production constraint up to the full, current set. Idempotent.
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
