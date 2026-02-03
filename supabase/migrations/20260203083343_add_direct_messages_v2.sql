/*
  # Add Direct Messages System

  1. New Tables
    - `conversations` - DM conversation threads
    - `conversation_participants` - Users in each conversation
    - `direct_messages` - Individual messages

  2. Security
    - Enable RLS on all tables
    - Users can only access conversations they're participants in
*/

-- Conversations table (create first without RLS policies that reference other tables)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean DEFAULT false,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_unique ON conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS conversation_participants_user_idx ON conversation_participants(user_id);

-- Direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  shared_topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS direct_messages_conversation_idx ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_idx ON direct_messages(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update conversations they participate in"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Conversation participants policies
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Direct messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = direct_messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = direct_messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages they sent"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_conversation_on_message ON direct_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Function to get or create a DM conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(other_user_id uuid)
RETURNS uuid AS $$
DECLARE
  conv_id uuid;
BEGIN
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE c.is_group = false
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  )
  AND (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO conversations (is_group) VALUES (false) RETURNING id INTO conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, auth.uid());
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, other_user_id);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;