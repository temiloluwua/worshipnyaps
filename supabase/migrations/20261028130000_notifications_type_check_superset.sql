/*
  # Widen notifications_type_check to the full set of types in use

  The live constraint was missing 'follow' (and 'like'/'repost'), so the
  notify_new_follower / notify_like / notify_repost triggers threw
  "violates check constraint notifications_type_check" on INSERT — which rolled
  back the originating follow/like/repost. This recreates the constraint with
  the complete superset so those actions work.
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
