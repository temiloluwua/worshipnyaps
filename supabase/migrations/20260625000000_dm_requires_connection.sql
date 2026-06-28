/*
  # DMs require a mutual connection

  ## Why
  The UI now hides the message button unless two users are connected, but
  the get_or_create_dm_conversation RPC will still happily create a new DM
  conversation between any two users (it's SECURITY DEFINER and bypasses
  the conversation_participants RLS). A determined client could still call
  the RPC directly. This locks it down server-side.

  ## What
  - Recreate get_or_create_dm_conversation so that, when no existing 1:1
    conversation is found between the two users, it requires them to be
    mutually connected (via the existing users_are_connected helper) before
    creating one. Existing conversations remain accessible — we only block
    new ones.
*/

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
    -- New conversations require a mutual connection. Existing ones (e.g.
    -- pre-dating this rule, or once-connected and now disconnected) stay
    -- usable — we only gate creation.
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
