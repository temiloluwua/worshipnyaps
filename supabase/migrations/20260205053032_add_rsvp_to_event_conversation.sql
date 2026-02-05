/*
  # Add RSVP attendees to event conversation

  1. Changes
    - Create trigger to add users to event conversation when they RSVP via event_attendees
  
  2. Notes
    - This complements the existing event_invitations trigger
    - Users who RSVP are automatically added to the event group chat
*/

-- Function to add RSVP attendee to event conversation
CREATE OR REPLACE FUNCTION add_rsvp_to_event_conversation()
RETURNS TRIGGER AS $$
DECLARE
  event_conversation_id uuid;
BEGIN
  -- Only proceed if status is registered
  IF NEW.status = 'registered' THEN
    -- Find the event's conversation
    SELECT id INTO event_conversation_id
    FROM conversations
    WHERE event_id = NEW.event_id;

    -- Add the user to the conversation if not already a participant
    IF event_conversation_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
      VALUES (event_conversation_id, NEW.user_id, now(), now())
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add RSVP attendee when they register
DROP TRIGGER IF EXISTS trigger_add_rsvp_to_event_conversation ON event_attendees;
CREATE TRIGGER trigger_add_rsvp_to_event_conversation
  AFTER INSERT OR UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION add_rsvp_to_event_conversation();
