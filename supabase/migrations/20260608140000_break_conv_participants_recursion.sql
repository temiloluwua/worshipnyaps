/*
  # Break the conversation_participants RLS recursion for real

  Why the plpgsql + SECURITY DEFINER fix didn't work:

  When a policy on table A calls a function whose body selects from table A,
  Postgres detects the self-reference and raises 42P17 ("infinite recursion
  detected in policy") even when the function is SECURITY DEFINER and
  LANGUAGE plpgsql. The recursion check happens at policy compilation
  time, not at runtime.

  The fix: don't reference conversation_participants from its own policy.

  The only legitimate need for "I can see this participant row" is:
    1. It's my own participation row — handled by user_id = auth.uid()
    2. It's a fellow participant in a conversation I'm in — handled by
       fetching from the conversation side via an RPC if needed

  Most client paths only need #1 (which conversations am I in?). The
  policies on conversations and direct_messages still use the function
  safely because those are different tables — no self-recursion.
*/

DROP POLICY IF EXISTS "Participants can read fellow participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can read their own participation rows" ON public.conversation_participants;

CREATE POLICY "Users can read their own participation rows"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
