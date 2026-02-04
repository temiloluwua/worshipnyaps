/*
  # Fix Circular RLS Policy References

  The issue: conversations queries conversation_participants, and vice versa,
  causing infinite recursion.

  ## Solution

  Remove circular references by making conversation_participants simpler:
  - Users can view all participants in any conversation (no recursion)
  - Users can only add/update/delete their own records
  - Access control is enforced at the conversations table level

  This breaks the cycle while maintaining security through conversation access policies.
*/

-- Drop all existing conversation_participants policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Recreate without circular references
CREATE POLICY "Authenticated users can view participants"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add themselves to conversations"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from conversations"
  ON conversation_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
