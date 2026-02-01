/*
  # Add Chat and Event Invitations

  1. New Tables
    - `chat_messages` - Community chat messages with optional direct messaging
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references users)
      - `recipient_id` (uuid, optional for direct messages)
      - `channel` (text, chat channel name for group chats)
      - `content` (text, message content)
      - `is_read` (boolean, for direct messages)
      - `created_at` (timestamp)

    - `event_invitations` - Invite friends to events
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `inviter_id` (uuid, references users)
      - `invitee_id` (uuid, references users)
      - `status` (pending, accepted, declined)
      - `message` (optional invitation message)
      - `created_at`, `responded_at` (timestamps)

  2. Schema Changes
    - Add `visibility` column to events (public, private, friends_only)

  3. Security
    - Enable RLS on all new tables
    - Chat messages: users can read messages in channels they're part of or DMs they sent/received
    - Event invitations: users can see invitations they sent or received
*/

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES users(id) ON DELETE CASCADE,
  channel text DEFAULT 'community',
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Event invitations table
CREATE TABLE IF NOT EXISTS event_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(event_id, invitee_id)
);

ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;

-- Add visibility column to events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE events ADD COLUMN visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends_only'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_invitations_event ON event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_invitee ON event_invitations(invitee_id);

-- RLS Policies for chat_messages

-- Users can read community messages
CREATE POLICY "Users can read community chat"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    channel = 'community'
    OR sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- RLS Policies for event_invitations

-- Users can see invitations they sent or received
CREATE POLICY "Users can view their invitations"
  ON event_invitations FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- Users can create invitations for events they're hosting or attending
CREATE POLICY "Users can send invitations"
  ON event_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND (
        events.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM event_attendees
          WHERE event_attendees.event_id = events.id
          AND event_attendees.user_id = auth.uid()
        )
      )
    )
  );

-- Invitees can update invitation status
CREATE POLICY "Invitees can respond to invitations"
  ON event_invitations FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

-- Inviters can cancel their invitations
CREATE POLICY "Inviters can delete invitations"
  ON event_invitations FOR DELETE
  TO authenticated
  USING (inviter_id = auth.uid());
