/*
  # Add 'event' notification type

  1. Changes
    - Updates the notifications table type check constraint to include 'event' as a valid type
    - This is needed for event invitation notifications

  2. Notes
    - Safe migration that just adds a new allowed value
*/

-- Drop existing constraint and add new one with 'event' type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY['general'::text, 'event_reminder'::text, 'connection_request'::text, 'volunteer_opportunity'::text, 'event_update'::text, 'event'::text]));
