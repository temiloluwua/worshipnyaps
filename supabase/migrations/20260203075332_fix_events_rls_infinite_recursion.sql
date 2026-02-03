/*
  # Fix infinite recursion in events RLS policies

  1. Problem
    - events SELECT policy references event_attendees table
    - event_attendees SELECT policy references events table
    - This creates circular dependency causing infinite recursion

  2. Solution
    - Drop the problematic policies
    - Create new policies that don't have circular references
    - Use simpler policy logic that avoids cross-table checks in both directions

  3. Changes
    - Drop and recreate events SELECT policy (remove event_attendees check)
    - Drop and recreate event_attendees SELECT policy (use user_id only)
*/

DROP POLICY IF EXISTS "Users can read public events and own events" ON events;
DROP POLICY IF EXISTS "Users can read attendees of events they're involved in" ON event_attendees;

CREATE POLICY "Users can read public events and own events"
  ON events FOR SELECT
  TO authenticated
  USING (
    is_private = false 
    OR host_id = auth.uid()
  );

CREATE POLICY "Anyone can read public event attendees"
  ON event_attendees FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_attendees.event_id 
      AND events.is_private = false
    )
    OR EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_attendees.event_id 
      AND events.host_id = auth.uid()
    )
  );