/*
  # Fix connection request acceptance under RLS

  ## Why
  Accepting a friend request creates two rows in `connections` (A->B and B->A).
  Under strict RLS this can fail when done as the recipient because one of those
  rows has `user_id` = requester, not `auth.uid()`.

  ## What
  - Replaces `create_mutual_connection()` trigger function with SECURITY DEFINER
    so the trigger can create both rows safely.
  - Locks request identity fields during updates to prevent tampering.
  - Recreates the trigger on `connection_requests`.
*/

CREATE OR REPLACE FUNCTION create_mutual_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Request identity is immutable once created.
  IF NEW.from_user_id IS DISTINCT FROM OLD.from_user_id
     OR NEW.to_user_id IS DISTINCT FROM OLD.to_user_id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    RAISE EXCEPTION 'Cannot modify connection request participants or event';
  END IF;

  -- Only create connections when moving from pending -> accepted.
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO connections (user_id, connected_user_id, connected_at, met_at_event_id)
    VALUES (NEW.from_user_id, NEW.to_user_id, now(), NEW.event_id)
    ON CONFLICT (user_id, connected_user_id) DO NOTHING;

    INSERT INTO connections (user_id, connected_user_id, connected_at, met_at_event_id)
    VALUES (NEW.to_user_id, NEW.from_user_id, now(), NEW.event_id)
    ON CONFLICT (user_id, connected_user_id) DO NOTHING;

    NEW.responded_at = COALESCE(NEW.responded_at, now());
  ELSIF NEW.status IN ('declined', 'accepted') AND OLD.status = 'pending' THEN
    NEW.responded_at = COALESCE(NEW.responded_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connection_request_accepted ON connection_requests;
CREATE TRIGGER connection_request_accepted
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_mutual_connection();
