/*
  # Fix Function Search Path Mutability

  This migration fixes functions that have mutable search_path configurations.
  These functions are defined with SECURITY DEFINER but don't have explicit search_path,
  making them vulnerable to search_path hijacking.

  ## Changes

  Functions fixed:
  1. increment_view_count
  2. prevent_role_escalation
  3. update_conversation_timestamp
  4. get_or_create_dm_conversation
  5. update_updated_at_column
  6. create_mutual_connection

  For each function, we set search_path to empty string ('') to prevent function resolution
  from being hijacked via search_path manipulation.
*/

-- increment_view_count
DROP FUNCTION IF EXISTS increment_view_count(text, uuid) CASCADE;
CREATE OR REPLACE FUNCTION increment_view_count(p_table text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table = 'topic' THEN
    UPDATE topics SET view_count = view_count + 1 WHERE id = p_id;
  ELSIF p_table = 'event' THEN
    UPDATE events SET view_count = view_count + 1 WHERE id = p_id;
  END IF;
END;
$$;

-- prevent_role_escalation
DROP FUNCTION IF EXISTS prevent_role_escalation() CASCADE;
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Role changes are not allowed';
  END IF;
  RETURN NEW;
END;
$$;

-- update_conversation_timestamp
DROP FUNCTION IF EXISTS update_conversation_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- get_or_create_dm_conversation
DROP FUNCTION IF EXISTS get_or_create_dm_conversation(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(p_user_id uuid, p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE is_group = false
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id AND user_id = p_user_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id AND user_id = p_other_user_id
  )
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (is_group, created_at, updated_at)
    VALUES (false, now(), now())
    RETURNING id INTO v_conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
    VALUES (v_conversation_id, p_user_id, now());

    INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
    VALUES (v_conversation_id, p_other_user_id, now());
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- update_updated_at_column
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- create_mutual_connection
DROP FUNCTION IF EXISTS create_mutual_connection(uuid, uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION create_mutual_connection(p_from_user_id uuid, p_to_user_id uuid, p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO connections (user_id, connected_user_id, met_at_event_id, created_at, updated_at)
  VALUES (p_from_user_id, p_to_user_id, p_event_id, now(), now())
  ON CONFLICT (user_id, connected_user_id) DO NOTHING;

  INSERT INTO connections (user_id, connected_user_id, met_at_event_id, created_at, updated_at)
  VALUES (p_to_user_id, p_from_user_id, p_event_id, now(), now())
  ON CONFLICT (user_id, connected_user_id) DO NOTHING;
END;
$$;
