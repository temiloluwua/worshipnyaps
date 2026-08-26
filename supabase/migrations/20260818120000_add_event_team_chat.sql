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
