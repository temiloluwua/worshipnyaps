/*
  # Fix infinite recursion in conversation / messaging RLS policies

  Mirrors the event-side fix in 20260604180000: a SECURITY DEFINER helper
  that checks conversation_participants directly, then rewrites the SELECT
  policies on conversation_participants, conversations, and direct_messages
  in terms of it. This breaks the recursive policy chain that was making
  "messages still don't work" and the empty-chat-list bug.
*/

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

-- =====================================================
-- conversation_participants
-- =====================================================
DROP POLICY IF EXISTS "Participants can read fellow participants" ON public.conversation_participants;

CREATE POLICY "Participants can read fellow participants"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_conversation_participant(conversation_id, auth.uid())
  );

-- =====================================================
-- conversations
-- =====================================================
DROP POLICY IF EXISTS "Participants can read their conversations" ON public.conversations;

CREATE POLICY "Participants can read their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- =====================================================
-- direct_messages
-- =====================================================
DROP POLICY IF EXISTS "Participants can read messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.direct_messages;

CREATE POLICY "Participants can read messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Participants can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

NOTIFY pgrst, 'reload schema';
