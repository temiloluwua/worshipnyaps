/*
  # Event Enhancements Migration

  ## Summary
  Adds several new capabilities to the events system:

  1. **Event Co-Hosts Table** (`event_cohosts`)
     - Allows a host to designate other users as co-hosts
     - Co-hosts get organizer-level access (organizer chat, management)
     - Columns: event_id, user_id, added_at, added_by

  2. **RSVP Details Table** (`event_rsvp_details`)
     - Stores enriched RSVP information submitted during RSVP flow
     - Tracks dietary restrictions, plus-one count, notes
     - One row per attendee per event

  3. **Pinned Announcements Table** (`event_announcements`)
     - Hosts can post pinned announcements visible at top of group chat
     - Columns: event_id, author_id, content, is_pinned, created_at

  ## Security
  - RLS enabled on all new tables
  - Co-hosts: only host can add/remove, authenticated users can read their own
  - RSVP details: user can manage their own row, host can read all for their events
  - Announcements: only host/co-host can insert, all attendees/host can read
*/

-- ─── Event Co-Hosts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_cohosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES users(id),
  added_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_cohosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cohosts for any event"
  ON event_cohosts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Event host can add cohosts"
  ON event_cohosts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.host_id = auth.uid()
    )
  );

CREATE POLICY "Event host can remove cohosts"
  ON event_cohosts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.host_id = auth.uid()
    )
  );

-- ─── RSVP Details ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_rsvp_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dietary_restrictions text DEFAULT '',
  plus_one_count integer DEFAULT 0 CHECK (plus_one_count >= 0 AND plus_one_count <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_rsvp_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own RSVP details"
  ON event_rsvp_details FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RSVP details"
  ON event_rsvp_details FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVP details"
  ON event_rsvp_details FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event host can view all RSVP details for their events"
  ON event_rsvp_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.host_id = auth.uid()
    )
  );

-- ─── Event Announcements ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees and host can view announcements"
  ON event_announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_id AND events.host_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM event_attendees
      WHERE event_attendees.event_id = event_announcements.event_id
      AND event_attendees.user_id = auth.uid()
      AND event_attendees.status = 'registered'
    )
    OR
    EXISTS (
      SELECT 1 FROM event_cohosts
      WHERE event_cohosts.event_id = event_announcements.event_id
      AND event_cohosts.user_id = auth.uid()
    )
  );

CREATE POLICY "Host and cohosts can post announcements"
  ON event_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      EXISTS (
        SELECT 1 FROM events WHERE events.id = event_id AND events.host_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM event_cohosts
        WHERE event_cohosts.event_id = event_announcements.event_id
        AND event_cohosts.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Host and cohosts can update announcements"
  ON event_announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_id AND events.host_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM event_cohosts
      WHERE event_cohosts.event_id = event_announcements.event_id
      AND event_cohosts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_id AND events.host_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM event_cohosts
      WHERE event_cohosts.event_id = event_announcements.event_id
      AND event_cohosts.user_id = auth.uid()
    )
  );

CREATE POLICY "Host and cohosts can delete announcements"
  ON event_announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_id AND events.host_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM event_cohosts
      WHERE event_cohosts.event_id = event_announcements.event_id
      AND event_cohosts.user_id = auth.uid()
    )
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_event_cohosts_event_id ON event_cohosts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cohosts_user_id ON event_cohosts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_details_event_id ON event_rsvp_details(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_details_user_id ON event_rsvp_details(user_id);
CREATE INDEX IF NOT EXISTS idx_event_announcements_event_id ON event_announcements(event_id);
