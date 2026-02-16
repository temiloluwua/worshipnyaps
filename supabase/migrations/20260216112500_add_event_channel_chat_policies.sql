/*
  # Allow event channel fallback in chat_messages

  ## Why
  The app now supports a fallback channel format `event:{event_id}` when the
  conversations table or event-conversation rows are unavailable.

  ## What
  Adds SELECT and INSERT policies for `chat_messages` that allow authenticated
  users with event access to read/write messages in those fallback channels.
*/

DROP POLICY IF EXISTS "Users can view event chat channel messages" ON chat_messages;
CREATE POLICY "Users can view event chat channel messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN channel ~ '^event:[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$'
      THEN EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = split_part(channel, ':', 2)::uuid
        AND (
          e.host_id = auth.uid()
          OR e.visibility = 'public'
          OR (e.visibility IS NULL AND COALESCE(e.is_private, false) = false)
          OR (
            e.visibility = 'friends_only'
            AND EXISTS (
              SELECT 1
              FROM connections c
              WHERE c.user_id = auth.uid()
              AND c.connected_user_id = e.host_id
              AND c.status = 'active'
            )
          )
          OR EXISTS (
            SELECT 1
            FROM event_attendees ea
            WHERE ea.event_id = e.id
            AND ea.user_id = auth.uid()
            AND ea.status = 'registered'
          )
        )
      )
      ELSE false
    END
  );

DROP POLICY IF EXISTS "Users can send event chat channel messages" ON chat_messages;
CREATE POLICY "Users can send event chat channel messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND CASE
      WHEN channel ~ '^event:[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$'
      THEN EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = split_part(channel, ':', 2)::uuid
        AND (
          e.host_id = auth.uid()
          OR e.visibility = 'public'
          OR (e.visibility IS NULL AND COALESCE(e.is_private, false) = false)
          OR (
            e.visibility = 'friends_only'
            AND EXISTS (
              SELECT 1
              FROM connections c
              WHERE c.user_id = auth.uid()
              AND c.connected_user_id = e.host_id
              AND c.status = 'active'
            )
          )
          OR EXISTS (
            SELECT 1
            FROM event_attendees ea
            WHERE ea.event_id = e.id
            AND ea.user_id = auth.uid()
            AND ea.status = 'registered'
          )
        )
      )
      ELSE false
    END
  );
