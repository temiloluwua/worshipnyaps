/*
  # Add Networking and Safety Features

  1. New Tables
    - `connections` - User connections/friendships within the app
    - `connection_requests` - Pending connection requests
    - `reports` - User and location reports for safety
    - `blocked_users` - User blocking functionality

  2. Security
    - Enable RLS on all new tables
    - Add policies for user privacy and safety
    - Restrict access to reports (admin only)

  3. Features
    - Friend/connection system
    - Report users and locations
    - Block users functionality
    - Admin moderation tools
*/

-- Connections table for user networking
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  connected_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  connected_at timestamptz DEFAULT now(),
  notes text,
  met_at_event_id uuid REFERENCES events(id),
  UNIQUE(user_id, connected_user_id),
  CHECK (user_id != connected_user_id)
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Connection requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  event_id uuid REFERENCES events(id),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Reports table for safety concerns
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('user', 'location', 'event')),
  reported_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reported_location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  reported_event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('inappropriate_behavior', 'safety_concern', 'harassment', 'spam', 'false_information', 'other')),
  description text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Connections policies
CREATE POLICY "Users can read their own connections" ON connections 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR connected_user_id = auth.uid());

CREATE POLICY "Users can create connections" ON connections 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own connections" ON connections 
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own connections" ON connections 
  FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Connection requests policies
CREATE POLICY "Users can read their connection requests" ON connection_requests 
  FOR SELECT TO authenticated 
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can create connection requests" ON connection_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can update requests they received" ON connection_requests 
  FOR UPDATE TO authenticated 
  USING (to_user_id = auth.uid());

-- Reports policies (only admins can read all reports)
CREATE POLICY "Users can create reports" ON reports 
  FOR INSERT TO authenticated 
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read their own reports" ON reports 
  FOR SELECT TO authenticated 
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can read all reports" ON reports 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update reports" ON reports 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Blocked users policies
CREATE POLICY "Users can manage their blocked users" ON blocked_users 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid());

-- Functions and triggers for updated_at
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create mutual connections
CREATE OR REPLACE FUNCTION create_mutual_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- When a connection request is accepted, create mutual connections
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create connection from requester to recipient
    INSERT INTO connections (user_id, connected_user_id, connected_at, met_at_event_id)
    VALUES (NEW.from_user_id, NEW.to_user_id, now(), NEW.event_id)
    ON CONFLICT (user_id, connected_user_id) DO NOTHING;
    
    -- Create connection from recipient to requester
    INSERT INTO connections (user_id, connected_user_id, connected_at, met_at_event_id)
    VALUES (NEW.to_user_id, NEW.from_user_id, now(), NEW.event_id)
    ON CONFLICT (user_id, connected_user_id) DO NOTHING;
    
    -- Update responded_at timestamp
    NEW.responded_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER connection_request_accepted
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_mutual_connection();
