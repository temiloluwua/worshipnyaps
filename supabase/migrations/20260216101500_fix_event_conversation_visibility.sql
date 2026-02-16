/*
  # Fix event conversation visibility for RSVP attendees

  ## Why
  Event chat can fail when a user RSVP's but is not yet a `conversation_participants` row.
  The old conversations SELECT policy only allowed current participants to see the conversation,
  which blocked users from discovering the event conversation and joining it.

  ## What this changes
  - Replaces existing conversations SELECT policies with one policy that allows:
    1) existing conversation participants, and
    2) users who can access the linked event (host, RSVP attendee, public event viewer, or
       friends-only viewer connected to the host).
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean DEFAULT false,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_unique ON conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS conversation_participants_user_idx ON conversation_participants(user_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can view accessible conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can view participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON conversation_participants;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'conversations'
    AND column_name = 'event_id'
  ) THEN
    ALTER TABLE conversations
      ADD COLUMN event_id uuid REFERENCES events(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_conversations_event_id ON conversations(event_id);
  END IF;
END $$;

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view accessible conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
    OR (
      conversations.event_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = conversations.event_id
        AND (
          e.host_id = auth.uid()
          OR e.visibility = 'public'
          OR (e.visibility IS NULL AND COALESCE(e.is_private, false) = false)
          OR (
            e.visibility = 'friends_only'
            AND EXISTS (
              SELECT 1
              FROM connections c
              WHERE c.user_id = auth.uid()
              AND c.connected_user_id = e.host_id
              AND c.status = 'active'
            )
          )
          OR EXISTS (
            SELECT 1
            FROM event_attendees ea
            WHERE ea.event_id = e.id
            AND ea.user_id = auth.uid()
            AND ea.status = 'registered'
          )
        )
      )
    )
  );

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
