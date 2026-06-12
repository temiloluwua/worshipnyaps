/*
  # Fix the DM creation RPC signature

  The original migration created get_or_create_dm_conversation(other_user_id uuid)
  but the client (useDirectMessages.startConversation) calls it with named
  params p_user_id + p_other_user_id. The signature mismatch causes the RPC
  to fail silently — no conversation gets created, no participants added,
  and the subsequent INSERT into direct_messages fails the
  is_conversation_participant check.

  Fix: drop the old function and recreate with the params the client expects.
  Keeps SECURITY DEFINER so the conversation_participants inserts for both
  users bypass RLS.
*/

DROP FUNCTION IF EXISTS public.get_or_create_dm_conversation(uuid);

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
    INSERT INTO public.conversations (is_group) VALUES (false) RETURNING id INTO conv_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, p_user_id);
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, p_other_user_id);
  END IF;

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
