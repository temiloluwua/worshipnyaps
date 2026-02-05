/*
  # Add Event Group Chats

  1. Changes
    - Add event_id column to conversations table to link conversations to events
    - Create trigger to automatically create a group conversation when an event is created
    - Create trigger to add users to event conversation when they accept an invitation
    - Automatically add event host to the conversation
  
  2. Security
    - Update RLS policies to allow event attendees to access event conversations
    - Ensure only accepted invitees can access the event chat
  
  3. Notes
    - Each event gets its own group conversation
    - Attendees are automatically added when they accept invitations
    - Event host is added automatically when event is created
*/

-- Add event_id column to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN event_id uuid REFERENCES events(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_conversations_event_id ON conversations(event_id);
  END IF;
END $$;

-- Function to create event conversation
CREATE OR REPLACE FUNCTION create_event_conversation()
RETURNS TRIGGER AS $$
DECLARE
  new_conversation_id uuid;
BEGIN
  -- Create a group conversation for the event
  INSERT INTO conversations (is_group, name, event_id, created_at, updated_at)
  VALUES (true, NEW.title || ' Group Chat', NEW.id, now(), now())
  RETURNING id INTO new_conversation_id;

  -- Add the event host as a participant
  INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
  VALUES (new_conversation_id, NEW.host_id, now(), now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create conversation when event is created
DROP TRIGGER IF EXISTS trigger_create_event_conversation ON events;
CREATE TRIGGER trigger_create_event_conversation
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_event_conversation();

-- Function to add attendee to event conversation
CREATE OR REPLACE FUNCTION add_attendee_to_event_conversation()
RETURNS TRIGGER AS $$
DECLARE
  event_conversation_id uuid;
BEGIN
  -- Only proceed if invitation is accepted
  IF NEW.status = 'accepted' THEN
    -- Find the event's conversation
    SELECT id INTO event_conversation_id
    FROM conversations
    WHERE event_id = NEW.event_id;

    -- Add the invitee to the conversation if not already a participant
    IF event_conversation_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
      VALUES (event_conversation_id, NEW.invitee_id, now(), now())
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add attendee when invitation is accepted
DROP TRIGGER IF EXISTS trigger_add_attendee_to_event_conversation ON event_invitations;
CREATE TRIGGER trigger_add_attendee_to_event_conversation
  AFTER INSERT OR UPDATE ON event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION add_attendee_to_event_conversation();

-- Add unique constraint to prevent duplicate participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversation_participants_conversation_user_unique'
  ) THEN
    ALTER TABLE conversation_participants 
    ADD CONSTRAINT conversation_participants_conversation_user_unique 
    UNIQUE (conversation_id, user_id);
  END IF;
END $$;

-- Update RLS policies for event conversations
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;
CREATE POLICY "Users can view conversations they're part of"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    channel IN (
      SELECT id::text 
      FROM conversations 
      WHERE id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON chat_messages;
CREATE POLICY "Users can send messages to their conversations"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    channel IN (
      SELECT id::text 
      FROM conversations 
      WHERE id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = auth.uid()
      )
    )
  );
