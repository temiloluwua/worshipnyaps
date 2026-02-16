/*
  # Fix notifications RLS for read access and mark-as-read updates

  ## Why
  The app reads from `notifications` and updates `is_read`, but some databases
  are missing explicit SELECT/UPDATE policies after prior policy changes.
  This causes "Failed to load notifications" and prevents the notifications tab
  from working.

  ## What
  - Ensures RLS is enabled on `notifications`
  - Adds explicit SELECT policy for the owner (`user_id = auth.uid()`)
  - Adds explicit UPDATE policy for the owner with matching WITH CHECK
*/

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
