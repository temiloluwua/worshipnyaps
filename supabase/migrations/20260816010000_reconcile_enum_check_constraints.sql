/*
  # Reconcile enum-style CHECK constraints (drift sweep)

  The 2026-08-11 migration-history reconciliation marked ~122 migrations
  "applied" without running them, so some CHECK constraints on prod may still
  be older/narrower than the app expects — rejecting valid values at insert
  time (as happened with notifications.type = 'role_request').

  This re-applies the CURRENT, full set for every enum-style CHECK. Widening a
  CHECK never rejects existing rows, so this is safe whether or not the original
  migration ran. Each fix is wrapped in its own DO block with exception handling
  so a missing table/column can't abort the rest of the sweep.

  Deliberately EXCLUDED (not safe to blind-batch):
  - Restrictive constraints that could fail against existing data
    (e.g. events_home_not_public_check, users_username_format regex).
  - Columns, RLS policies, functions, and grants — those can abort on a missing
    dependency in a single transaction; reconcile those via a schema-dump diff
    if needed.
*/

DO $$ BEGIN
  ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
  ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN ('bible_study', 'yap', 'church', 'evangelism'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip events_event_type_check: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'general', 'event_reminder', 'connection_request', 'connection_accepted',
      'volunteer_opportunity', 'event_update', 'event', 'comment', 'rsvp', 'dm',
      'role_request', 'cohost_added', 'event_cancelled', 'event_postponed',
      'like', 'repost', 'mention', 'follow', 'report'
    ));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip notifications_type_check: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE public.food_items DROP CONSTRAINT IF EXISTS food_items_category_check;
  ALTER TABLE public.food_items ADD CONSTRAINT food_items_category_check
    CHECK (category IN ('main', 'side', 'snacks', 'dessert', 'beverage', 'setup'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip food_items_category_check: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_likeable_type_check;
  ALTER TABLE public.likes ADD CONSTRAINT likes_likeable_type_check
    CHECK (likeable_type IN ('topic', 'comment', 'community_post'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip likes_likeable_type_check: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_report_type_check;
  ALTER TABLE public.reports ADD CONSTRAINT reports_report_type_check
    CHECK (report_type IN ('user','location','event','topic','comment','message',
                           'announcement','help_request','community_post'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip reports_report_type_check: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('member', 'host', 'moderator', 'admin'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip users_role_check: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE public.event_help_requests DROP CONSTRAINT IF EXISTS valid_request_type;
  ALTER TABLE public.event_help_requests ADD CONSTRAINT valid_request_type
    CHECK (request_type IN ('prayer', 'worship', 'tech', 'discussion', 'hospitality', 'food', 'setup', 'other'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip valid_request_type: %', SQLERRM; END $$;

NOTIFY pgrst, 'reload schema';
