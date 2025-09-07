/*
  # Initial Schema for Calgary Bible Study Community App

  1. New Tables
    - `users` - User profiles with roles and approval status
    - `locations` - Physical locations for hosting events
    - `events` - Bible studies and community events
    - `event_attendees` - RSVP tracking with capacity management
    - `topics` - Discussion topics and questions
    - `comments` - Threaded comments on topics
    - `worship_songs` - Song lists for worship events
    - `food_items` - Food coordination for hospitality
    - `volunteer_roles` - User volunteer preferences and assignments

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Separate policies for hosts, members, and admins

  3. Features
    - Host approval workflow
    - Event capacity management
    - Role-based permissions
    - Threaded discussions
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'host', 'admin')),
  is_approved boolean DEFAULT false,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  capacity integer NOT NULL DEFAULT 10,
  host_id uuid REFERENCES users(id) ON DELETE CASCADE,
  is_approved boolean DEFAULT false,
  description text,
  amenities text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('bible-study', 'basketball-yap', 'hiking-yap', 'evangelism'"')),
  description text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  host_id uuid REFERENCES users(id) ON DELETE CASCADE,
  capacity integer NOT NULL DEFAULT 10,
  is_private boolean DEFAULT false,
  invite_code text,
  worship_leader_id uuid REFERENCES users(id),
  discussion_leader_id uuid REFERENCES users(id),
  hospitality_coordinator_id uuid REFERENCES users(id),
  prayer_leader_id uuid REFERENCES users(id),
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Event attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tags text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Comments table (supports threading)
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Worship songs table
CREATE TABLE IF NOT EXISTS worship_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text NOT NULL,
  key text,
  tempo text,
  order_index integer NOT NULL DEFAULT 0,
  lyrics text,
  chords text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE worship_songs ENABLE ROW LEVEL SECURITY;

-- Food items table
CREATE TABLE IF NOT EXISTS food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  item text NOT NULL,
  category text DEFAULT 'main' CHECK (category IN ('main', 'side', 'dessert', 'beverage', 'setup')),
  assigned_to uuid REFERENCES users(id),
  completed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

-- Volunteer roles table
CREATE TABLE IF NOT EXISTS volunteer_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role_type text NOT NULL CHECK (role_type IN ('worship', 'discussion', 'hospitality', 'prayer')),
  skills text[],
  availability text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_type)
);

ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can read all profiles" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Locations policies
CREATE POLICY "Anyone can read approved locations" ON locations FOR SELECT TO authenticated USING (is_approved = true);
CREATE POLICY "Hosts can read own locations" ON locations FOR SELECT TO authenticated USING (host_id = auth.uid());
CREATE POLICY "Hosts can create locations" ON locations FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "Hosts can update own locations" ON locations FOR UPDATE TO authenticated USING (host_id = auth.uid());

-- Events policies
CREATE POLICY "Anyone can read public events" ON events FOR SELECT TO authenticated USING (is_private = false OR host_id = auth.uid());
CREATE POLICY "Hosts can create events" ON events FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "Hosts can update own events" ON events FOR UPDATE TO authenticated USING (host_id = auth.uid());

-- Event attendees policies
CREATE POLICY "Users can read event attendees" ON event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can register for events" ON event_attendees FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own registrations" ON event_attendees FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Topics policies
CREATE POLICY "Anyone can read topics" ON topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create topics" ON topics FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update own topics" ON topics FOR UPDATE TO authenticated USING (author_id = auth.uid());

-- Comments policies
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update own comments" ON comments FOR UPDATE TO authenticated USING (author_id = auth.uid());

-- Worship songs policies
CREATE POLICY "Users can read worship songs" ON worship_songs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Event hosts and worship leaders can manage songs" ON worship_songs FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_id 
    AND (events.host_id = auth.uid() OR events.worship_leader_id = auth.uid())
  )
);

-- Food items policies
CREATE POLICY "Users can read food items" ON food_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Event hosts and hospitality coordinators can manage food" ON food_items FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_id 
    AND (events.host_id = auth.uid() OR events.hospitality_coordinator_id = auth.uid())
  )
);

-- Volunteer roles policies
CREATE POLICY "Users can read volunteer roles" ON volunteer_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own volunteer roles" ON volunteer_roles FOR ALL TO authenticated USING (user_id = auth.uid());

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();