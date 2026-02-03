/*
  # Add increment_view_count function

  1. New Functions
    - `increment_view_count(topic_id uuid)` - Atomically increments the view count for a topic

  2. Security
    - Function is accessible to authenticated users
    - Performs atomic update to avoid race conditions
*/

CREATE OR REPLACE FUNCTION increment_view_count(topic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE topics
  SET view_count = view_count + 1
  WHERE id = topic_id;
END;
$$;