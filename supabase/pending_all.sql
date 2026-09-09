-- ============================================================
-- Worship N Yaps — all pending migrations, dependency-ordered.
-- Idempotent; safe to run once in the Supabase SQL editor.
-- ============================================================


-- >>> migrations/20260819120000_add_volunteering_event_type.sql

/*
  # Add 'volunteering' event type

  Extends the events.event_type CHECK constraint to allow 'volunteering'
  alongside the existing bible_study / yap / church / evangelism values, so
  hosts can create volunteering gatherings. Idempotent.
*/

DO $$
BEGIN
  ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
  ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN ('bible_study', 'yap', 'church', 'evangelism', 'volunteering'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'skip events_event_type_check: %', SQLERRM;
END $$;

-- >>> migrations/20260819130000_add_content_translations_cache.sql

/*
  # Shared content-translation cache

  Stores one row per (language, source text) so a given phrase is translated by
  the external (free) provider at most once ever, then served to every user
  from the DB. This keeps on-the-fly card translation reliably free — cache hits
  never touch the provider, so rate limits are a non-issue at scale.

  Security
    - Public read: translations of public card content are not sensitive.
    - Authenticated insert only (upsert on conflict), so signed-in clients can
      populate the cache after a provider call. No update/delete for clients.
*/

CREATE TABLE IF NOT EXISTS public.content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lang text NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lang, source_text)
);

CREATE INDEX IF NOT EXISTS idx_content_translations_lookup
  ON public.content_translations (lang, source_text);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read content translations" ON public.content_translations;
CREATE POLICY "Anyone can read content translations"
  ON public.content_translations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can add content translations" ON public.content_translations;
CREATE POLICY "Authenticated can add content translations"
  ON public.content_translations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- >>> migrations/20260818120000_add_event_team_chat.sql

/*
  # Worship-team group chat per event

  Adds a dedicated "team" group conversation for each event, separate from the
  attendee event chat. Membership = the event host + all co-hosts
  (rows in event_cohosts). The client points the existing organizer/team chat
  UI at this conversation's id, so read/write is governed by the proven
  conversation-membership RLS on chat_messages.

  1. Schema
     - conversations.is_team_chat (bool, default false)

  2. Functions / triggers
     - create_event_conversation(): also creates the team conversation + adds host
     - add_attendee_to_event_conversation(): now targets the attendee (non-team)
       conversation only, so attendees are never added to the team chat
     - add_cohost_to_team_conversation(): AFTER INSERT on event_cohosts adds the
       co-host to the event's team conversation (creates it if missing)

  3. Backfill
     - Creates a team conversation for every existing event and adds the host and
       all existing co-hosts as participants

  4. Security
     - Reuses existing membership-based RLS on conversations / chat_messages.
       No new policies required — participants can read/write; non-members cannot.

  This migration is idempotent.
*/

-- 1. Column ------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_team_chat boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conversations_event_team
  ON public.conversations (event_id, is_team_chat);

-- 2a. Event conversation creator now also creates the team chat ---------------
CREATE OR REPLACE FUNCTION create_event_conversation()
RETURNS TRIGGER AS $$
DECLARE
  attendee_conversation_id uuid;
  team_conversation_id uuid;
BEGIN
  -- Attendee (everyone) chat
  INSERT INTO conversations (is_group, name, event_id, is_team_chat, created_at, updated_at)
  VALUES (true, NEW.title || ' Group Chat', NEW.id, false, now(), now())
  RETURNING id INTO attendee_conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
  VALUES (attendee_conversation_id, NEW.host_id, now(), now())
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Team (host + co-hosts) chat
  INSERT INTO conversations (is_group, name, event_id, is_team_chat, created_at, updated_at)
  VALUES (true, NEW.title || ' Team Chat', NEW.id, true, now(), now())
  RETURNING id INTO team_conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
  VALUES (team_conversation_id, NEW.host_id, now(), now())
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2b. Attendees join the attendee (non-team) conversation only ----------------
CREATE OR REPLACE FUNCTION add_attendee_to_event_conversation()
RETURNS TRIGGER AS $$
DECLARE
  event_conversation_id uuid;
BEGIN
  IF NEW.status = 'accepted' THEN
    SELECT id INTO event_conversation_id
    FROM conversations
    WHERE event_id = NEW.event_id AND is_team_chat = false
    ORDER BY created_at ASC
    LIMIT 1;

    IF event_conversation_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
      VALUES (event_conversation_id, NEW.invitee_id, now(), now())
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2c. Co-hosts join the team conversation (create it if missing) --------------
CREATE OR REPLACE FUNCTION add_cohost_to_team_conversation()
RETURNS TRIGGER AS $$
DECLARE
  team_conversation_id uuid;
  ev RECORD;
BEGIN
  SELECT id INTO team_conversation_id
  FROM conversations
  WHERE event_id = NEW.event_id AND is_team_chat = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF team_conversation_id IS NULL THEN
    SELECT id, title, host_id INTO ev FROM events WHERE id = NEW.event_id;
    IF ev.id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO conversations (is_group, name, event_id, is_team_chat, created_at, updated_at)
    VALUES (true, COALESCE(ev.title, 'Event') || ' Team Chat', NEW.event_id, true, now(), now())
    RETURNING id INTO team_conversation_id;

    -- Make sure the host is always in the team chat.
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
    VALUES (team_conversation_id, ev.host_id, now(), now())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
  VALUES (team_conversation_id, NEW.user_id, now(), now())
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_cohost_to_team_conversation ON event_cohosts;
CREATE TRIGGER trigger_add_cohost_to_team_conversation
  AFTER INSERT ON event_cohosts
  FOR EACH ROW
  EXECUTE FUNCTION add_cohost_to_team_conversation();

-- 3. Backfill team conversations for existing events --------------------------
DO $$
DECLARE
  e RECORD;
  team_id uuid;
BEGIN
  FOR e IN SELECT id, title, host_id FROM events LOOP
    SELECT id INTO team_id
    FROM conversations
    WHERE event_id = e.id AND is_team_chat = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF team_id IS NULL THEN
      INSERT INTO conversations (is_group, name, event_id, is_team_chat, created_at, updated_at)
      VALUES (true, COALESCE(e.title, 'Event') || ' Team Chat', e.id, true, now(), now())
      RETURNING id INTO team_id;
    END IF;

    -- Host
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
    VALUES (team_id, e.host_id, now(), now())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    -- Existing co-hosts
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
    SELECT team_id, c.user_id, now(), now()
    FROM event_cohosts c
    WHERE c.event_id = e.id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- >>> migrations/20260901000000_general_polls.sql

/*
  # General-purpose polls for events and groups

  A poll has a question + text options; members vote (single or multi-select),
  results are visible live, and the creator/host/leader can close it. Distinct
  from the group *scheduling* polls (event_polls) which propose dates.

  Scope: each poll belongs to exactly one event OR one group.

  Security
    - Reads gated by event access / group membership (SECURITY DEFINER helpers,
      never inlined → no RLS recursion).
    - All writes go through SECURITY DEFINER RPCs that check permission, so the
      tables have SELECT policies only (no direct client insert/update/delete).
*/

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  question text NOT NULL,
  allow_multiple boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- exactly one scope
  CONSTRAINT polls_one_scope CHECK ((event_id IS NOT NULL) <> (group_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_polls_event ON public.polls(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_group ON public.polls(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.poll_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_poll_choices_poll ON public.poll_choices(poll_id);

CREATE TABLE IF NOT EXISTS public.poll_choice_votes (
  choice_id uuid NOT NULL REFERENCES public.poll_choices(id) ON DELETE CASCADE,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (choice_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_choice_votes(poll_id);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER — bypass RLS, no recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_event(p_event uuid, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e WHERE e.id = p_event AND (
      e.host_id = p_user
      OR e.visibility = 'public'
      OR (e.visibility IS NULL AND COALESCE(e.is_private, false) = false)
      OR EXISTS (SELECT 1 FROM event_cohosts c WHERE c.event_id = p_event AND c.user_id = p_user)
      OR EXISTS (SELECT 1 FROM event_attendees a WHERE a.event_id = p_event AND a.user_id = p_user AND a.status IN ('registered','attended'))
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_access_event(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_event(p_event uuid, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events e WHERE e.id = p_event AND e.host_id = p_user)
      OR EXISTS (SELECT 1 FROM event_cohosts c WHERE c.event_id = p_event AND c.user_id = p_user);
$$;
GRANT EXECUTE ON FUNCTION public.can_manage_event(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: SELECT only (writes via RPCs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_choice_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read polls you can access" ON public.polls;
CREATE POLICY "Read polls you can access"
  ON public.polls FOR SELECT TO authenticated
  USING (
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    OR (event_id IS NOT NULL AND public.can_access_event(event_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Read choices of visible polls" ON public.poll_choices;
CREATE POLICY "Read choices of visible polls"
  ON public.poll_choices FOR SELECT TO authenticated
  USING (poll_id IN (SELECT id FROM public.polls));

DROP POLICY IF EXISTS "Read votes of visible polls" ON public.poll_choice_votes;
CREATE POLICY "Read votes of visible polls"
  ON public.poll_choice_votes FOR SELECT TO authenticated
  USING (poll_id IN (SELECT id FROM public.polls));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_poll(
  p_event_id uuid,
  p_group_id uuid,
  p_question text,
  p_allow_multiple boolean,
  p_choices text[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll_id uuid;
  v_choice text;
  v_i int := 0;
  v_clean text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (p_event_id IS NOT NULL) = (p_group_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Poll must belong to exactly one event or group';
  END IF;
  IF COALESCE(btrim(p_question), '') = '' THEN RAISE EXCEPTION 'Question is required'; END IF;

  -- de-dupe + trim choices, need >= 2
  SELECT array_agg(c) INTO v_clean FROM (
    SELECT DISTINCT btrim(x) AS c FROM unnest(p_choices) x WHERE btrim(x) <> ''
  ) s;
  IF v_clean IS NULL OR array_length(v_clean, 1) < 2 THEN
    RAISE EXCEPTION 'Add at least two options';
  END IF;

  -- permission: event host/cohost, or group member
  IF p_event_id IS NOT NULL THEN
    IF NOT public.can_manage_event(p_event_id, v_uid) THEN
      RAISE EXCEPTION 'Only the host or a co-host can create event polls';
    END IF;
  ELSE
    IF NOT public.is_group_member(p_group_id, v_uid) THEN
      RAISE EXCEPTION 'Only group members can create polls';
    END IF;
  END IF;

  INSERT INTO polls (event_id, group_id, question, allow_multiple, created_by)
  VALUES (p_event_id, p_group_id, btrim(p_question), COALESCE(p_allow_multiple, false), v_uid)
  RETURNING id INTO v_poll_id;

  FOREACH v_choice IN ARRAY v_clean LOOP
    INSERT INTO poll_choices (poll_id, text, sort_order) VALUES (v_poll_id, v_choice, v_i);
    v_i := v_i + 1;
  END LOOP;

  RETURN v_poll_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_poll(uuid, uuid, text, boolean, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_poll_choice_vote(p_choice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll polls%ROWTYPE;
  v_already boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT p.* INTO v_poll FROM polls p
  JOIN poll_choices c ON c.poll_id = p.id
  WHERE c.id = p_choice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll option not found'; END IF;
  IF v_poll.status <> 'open' THEN RAISE EXCEPTION 'This poll is closed'; END IF;

  -- must be able to access the poll's scope
  IF v_poll.event_id IS NOT NULL THEN
    IF NOT public.can_access_event(v_poll.event_id, v_uid) THEN RAISE EXCEPTION 'You cannot vote on this poll'; END IF;
  ELSE
    IF NOT public.is_group_member(v_poll.group_id, v_uid) THEN RAISE EXCEPTION 'You cannot vote on this poll'; END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM poll_choice_votes WHERE choice_id = p_choice_id AND user_id = v_uid) INTO v_already;

  IF v_already THEN
    DELETE FROM poll_choice_votes WHERE choice_id = p_choice_id AND user_id = v_uid;
  ELSE
    -- single-select: clear the user's other votes on this poll first
    IF NOT v_poll.allow_multiple THEN
      DELETE FROM poll_choice_votes WHERE poll_id = v_poll.id AND user_id = v_uid;
    END IF;
    INSERT INTO poll_choice_votes (choice_id, poll_id, user_id) VALUES (p_choice_id, v_poll.id, v_uid)
    ON CONFLICT (choice_id, user_id) DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_poll_choice_vote(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_poll(p_poll_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll polls%ROWTYPE;
  v_can boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll not found'; END IF;

  v_can := (v_poll.created_by = v_uid);
  IF NOT v_can AND v_poll.event_id IS NOT NULL THEN v_can := public.can_manage_event(v_poll.event_id, v_uid); END IF;
  IF NOT v_can AND v_poll.group_id IS NOT NULL THEN v_can := public.is_group_leader(v_poll.group_id, v_uid); END IF;
  IF NOT v_can THEN RAISE EXCEPTION 'You cannot close this poll'; END IF;

  UPDATE polls SET status = 'closed' WHERE id = p_poll_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_poll(uuid) TO authenticated;

-- >>> migrations/20260905000000_friends_of_friends_events.sql

/*
  # Friends-of-friends event visibility

  Adds a 'friends_of_friends' visibility: the event is visible to the host's
  direct connections AND their mutuals (friends of friends). Because visibility
  is what surfaces an event in a viewer's feed, this also makes the event "show
  up for your mutuals."

  - events.visibility CHECK gains 'friends_of_friends'
  - users_are_friends_or_fof(a, b): direct connection OR a shared mutual
  - events SELECT policy, can_user_see_event(), and its dependent policies
    (RSVP insert, locations select) all honor the new value
*/

-- 1. Allow the new visibility value
DO $$
BEGIN
  ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_visibility_check;
  ALTER TABLE public.events ADD CONSTRAINT events_visibility_check
    CHECK (visibility IN ('public', 'private', 'friends_only', 'friends_of_friends'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip events_visibility_check: %', SQLERRM; END $$;

-- 2. Friend-or-friend-of-friend helper (SECURITY DEFINER — no RLS recursion)
CREATE OR REPLACE FUNCTION public.users_are_friends_or_fof(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p_a = p_b
    OR public.users_are_connected(p_a, p_b)
    OR EXISTS (
      -- a mutual X where b is connected to X and X is connected to a
      SELECT 1
      FROM connections c1
      JOIN connections c2 ON c2.user_id = c1.connected_user_id
      WHERE c1.user_id = p_b AND c1.status = 'active'
        AND c2.connected_user_id = p_a AND c2.status = 'active'
        AND c1.connected_user_id <> p_a
        AND c1.connected_user_id <> p_b
    );
$$;
GRANT EXECUTE ON FUNCTION public.users_are_friends_or_fof(uuid, uuid) TO authenticated;

-- 3. Events SELECT policy
DROP POLICY IF EXISTS "Events: public, host, cohost, attendee, friend" ON public.events;
CREATE POLICY "Events: public, host, cohost, attendee, friend"
  ON public.events FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR public.is_event_cohost(id, auth.uid())
    OR public.is_event_attendee(id, auth.uid())
    OR (visibility = 'friends_only' AND public.users_are_connected(host_id, auth.uid()))
    OR (visibility = 'friends_of_friends' AND public.users_are_friends_or_fof(host_id, auth.uid()))
  );

-- 4. can_user_see_event() + recreate its dependent policies (CASCADE drop)
DROP FUNCTION IF EXISTS public.can_user_see_event(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.can_user_see_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_can boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND (
        e.visibility = 'public'
        OR e.host_id = p_user_id
        OR public.is_event_cohost(e.id, p_user_id)
        OR public.is_event_attendee(e.id, p_user_id)
        OR (e.visibility = 'friends_only' AND public.users_are_connected(e.host_id, p_user_id))
        OR (e.visibility = 'friends_of_friends' AND public.users_are_friends_or_fof(e.host_id, p_user_id))
      )
  ) INTO v_can;
  RETURN v_can;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_user_see_event(uuid, uuid) TO authenticated;

CREATE POLICY "Users can RSVP to events they can see"
  ON public.event_attendees FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_user_see_event(event_id, auth.uid())
  );

CREATE POLICY "Locations visible to authorized event viewers"
  ON public.locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.location_id = locations.id
        AND public.can_user_see_event(e.id, auth.uid())
        AND (
          e.host_id = auth.uid()
          OR public.is_event_cohost(e.id, auth.uid())
          OR e.address_visibility = 'public'
          OR (e.address_visibility = 'attendees_only' AND public.is_event_attendee(e.id, auth.uid()))
        )
    )
  );

NOTIFY pgrst, 'reload schema';

-- >>> migrations/20260905010000_event_friends_going.sql

/*
  # "N friends going" social proof for events

  For a batch of events, return how many of the viewer's own connections are
  attending (+ one sample name). SECURITY DEFINER so it can read attendees, but
  it only ever counts the caller's own friends — never exposes anyone else.
*/

CREATE OR REPLACE FUNCTION public.event_friends_going(p_event_ids uuid[])
RETURNS TABLE (event_id uuid, going_count int, sample_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT a.event_id,
         COUNT(*)::int AS going_count,
         (ARRAY_AGG(u.name ORDER BY u.name))[1] AS sample_name
  FROM event_attendees a
  JOIN users u ON u.id = a.user_id
  WHERE a.event_id = ANY(p_event_ids)
    AND a.status IN ('registered', 'attended')
    AND a.user_id <> auth.uid()
    AND public.users_are_connected(a.user_id, auth.uid())
  GROUP BY a.event_id;
$$;
GRANT EXECUTE ON FUNCTION public.event_friends_going(uuid[]) TO authenticated;

-- >>> migrations/20260907000000_event_notes.sql

/*
  # Event notes

  Attendees/hosts can jot notes during and after an event. The author sees their
  own notes; the host/co-hosts and admins can read all notes for the event
  (admins then curate them into new discussion topics).

  Reuses the SECURITY DEFINER helpers can_access_event / can_manage_event from
  the polls migration.
*/

CREATE TABLE IF NOT EXISTS public.event_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_notes_event ON public.event_notes(event_id, created_at DESC);

ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;

-- Read: your own notes, or (host/co-host/admin) all notes for the event.
DROP POLICY IF EXISTS "Read event notes" ON public.event_notes;
CREATE POLICY "Read event notes"
  ON public.event_notes FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR public.can_manage_event(event_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Write your own note on an event you can access.
DROP POLICY IF EXISTS "Add own event note" ON public.event_notes;
CREATE POLICY "Add own event note"
  ON public.event_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_access_event(event_id, auth.uid()));

DROP POLICY IF EXISTS "Edit own event note" ON public.event_notes;
CREATE POLICY "Edit own event note"
  ON public.event_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Delete own event note" ON public.event_notes;
CREATE POLICY "Delete own event note"
  ON public.event_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());
