/*
  # Block enforcement — stop blocked users from messaging each other

  ## Why
  The app writes rows to blocked_users but nothing enforced them server-side.
  App Store Guideline 1.2 requires that blocking an abusive user actually
  works. Feed/list content from blocked users is hidden client-side (the same
  pattern AttendeeList already uses), but messaging must be enforced on the
  server so a blocked user can't reach someone via a direct API call.

  ## What
  - is_blocked_between(a, b): true if either user has blocked the other.
  - BEFORE INSERT trigger on direct_messages that rejects a message when the
    sender and any other participant in the conversation have a block between
    them (in either direction).
  - Also gate get_or_create_dm_conversation so a new DM can't be opened toward
    someone you've blocked / who has blocked you (mirrors the existing
    connection gate).
*/

-- True when a has blocked b, or b has blocked a.
CREATE OR REPLACE FUNCTION public.is_blocked_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users bu
    WHERE (bu.user_id = a AND bu.blocked_user_id = b)
       OR (bu.user_id = b AND bu.blocked_user_id = a)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;

-- Reject new direct messages toward a participant with a block in either
-- direction. Never blocks on unexpected errors — fail open so a lookup issue
-- can't wedge messaging entirely, except the explicit block case.
CREATE OR REPLACE FUNCTION public.enforce_dm_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id <> NEW.sender_id
      AND public.is_blocked_between(NEW.sender_id, cp.user_id)
  ) INTO v_blocked;

  IF v_blocked THEN
    RAISE EXCEPTION 'You cannot message a user you have blocked or who has blocked you';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_dm_block ON public.direct_messages;
CREATE TRIGGER trg_enforce_dm_block
  BEFORE INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dm_block();

-- Also block opening a fresh DM conversation toward a blocked user. Keeps the
-- existing mutual-connection requirement intact.
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(
  p_user_id uuid,
  p_other_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_other_user_id IS NULL OR p_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Invalid user ids for DM';
  END IF;

  IF public.is_blocked_between(p_user_id, p_other_user_id) THEN
    RAISE EXCEPTION 'You cannot message a user you have blocked or who has blocked you';
  END IF;

  SELECT c.id INTO conv_id
  FROM public.conversations c
  WHERE COALESCE(c.is_group, false) = false
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = p_other_user_id
    )
    AND (SELECT COUNT(*) FROM public.conversation_participants cp WHERE cp.conversation_id = c.id) = 2
  LIMIT 1;

  IF conv_id IS NULL THEN
    IF NOT public.users_are_connected(p_user_id, p_other_user_id) THEN
      RAISE EXCEPTION 'You can only start a conversation with someone you are connected with';
    END IF;

    INSERT INTO public.conversations (is_group) VALUES (false) RETURNING id INTO conv_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, p_user_id);
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, p_other_user_id);
  END IF;

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
