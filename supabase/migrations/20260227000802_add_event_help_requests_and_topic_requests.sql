/*
  # Add Event Help Requests, Topic Requests, Community Categories, Description Templates

  1. New Tables
    - `event_help_requests`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `request_type` (text) - prayer, worship, tech, discussion, hospitality, food, setup, other
      - `title` (text) - short description of what is needed
      - `description` (text, nullable) - detailed description
      - `status` (text) - open, filled, in_progress
      - `assigned_user_id` (uuid, nullable, references users)
      - `created_at` (timestamptz)

    - `topic_requests`
      - `id` (uuid, primary key)
      - `title` (text) - requested topic title
      - `description` (text, nullable) - why this topic is important
      - `bible_verse` (text, nullable) - suggested scripture
      - `category` (text) - requested category
      - `requested_by` (uuid, references users)
      - `status` (text) - pending, approved, rejected
      - `admin_notes` (text, nullable)
      - `created_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)

  2. Modified Tables
    - `topics` - add `community_category` column (prayer_point, testimony, bible_study, question, general)
    - `events` - add `description_template` column (jsonb, nullable)
    - `users` - add `preferred_language` column (text, nullable)

  3. Security
    - RLS enabled on all new tables
    - Policies for authenticated users to manage their own data
    - Host-only policies for event help requests
*/

-- event_help_requests table
CREATE TABLE IF NOT EXISTS event_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  assigned_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_request_type CHECK (request_type IN ('prayer', 'worship', 'tech', 'discussion', 'hospitality', 'food', 'setup', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'filled', 'in_progress'))
);

ALTER TABLE event_help_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view help requests for events they can see"
  ON event_help_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_help_requests.event_id
      AND (e.visibility = 'public' OR e.host_id = auth.uid())
    )
  );

CREATE POLICY "Event hosts can create help requests"
  ON event_help_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_help_requests.event_id
      AND e.host_id = auth.uid()
    )
  );

CREATE POLICY "Event hosts can update help requests"
  ON event_help_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_help_requests.event_id
      AND e.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_help_requests.event_id
      AND e.host_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can volunteer for help requests"
  ON event_help_requests FOR UPDATE
  TO authenticated
  USING (
    status = 'open' AND assigned_user_id IS NULL
  )
  WITH CHECK (
    assigned_user_id = auth.uid() AND status = 'filled'
  );

CREATE POLICY "Event hosts can delete help requests"
  ON event_help_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_help_requests.event_id
      AND e.host_id = auth.uid()
    )
  );

-- topic_requests table
CREATE TABLE IF NOT EXISTS topic_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  bible_verse text,
  category text NOT NULL DEFAULT 'life-questions',
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE topic_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topic requests"
  ON topic_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Admins can view all topic requests"
  ON topic_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create topic requests"
  ON topic_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can update topic requests"
  ON topic_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Add community_category to topics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics' AND column_name = 'community_category'
  ) THEN
    ALTER TABLE topics ADD COLUMN community_category text DEFAULT 'general';
  END IF;
END $$;

-- Add description_template to events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'description_template'
  ) THEN
    ALTER TABLE events ADD COLUMN description_template jsonb;
  END IF;
END $$;

-- Add preferred_language to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_language text;
  END IF;
END $$;

-- Add channel_type to conversations for organizer chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'channel_type'
  ) THEN
    ALTER TABLE conversations ADD COLUMN channel_type text DEFAULT 'general';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_help_requests_event_id ON event_help_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_help_requests_status ON event_help_requests(status);
CREATE INDEX IF NOT EXISTS idx_topic_requests_status ON topic_requests(status);
CREATE INDEX IF NOT EXISTS idx_topic_requests_requested_by ON topic_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_topics_community_category ON topics(community_category);
