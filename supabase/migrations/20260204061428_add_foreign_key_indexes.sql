/*
  # Add Indexes for Unindexed Foreign Keys

  This migration adds indexes to foreign key columns for better query performance.
  Each foreign key should have a covering index to avoid sequential scans and improve query efficiency.

  ## New Indexes

  1. **blocked_users table**
     - `idx_blocked_users_blocked_user_id` on `blocked_user_id`

  2. **bookmarks table**
     - `idx_bookmarks_topic_id` on `topic_id`

  3. **comments table**
     - `idx_comments_author_id` on `author_id`
     - `idx_comments_parent_id` on `parent_id`
     - `idx_comments_topic_id` on `topic_id`

  4. **connection_requests table**
     - `idx_connection_requests_event_id` on `event_id`
     - `idx_connection_requests_to_user_id` on `to_user_id`

  5. **connections table**
     - `idx_connections_connected_user_id` on `connected_user_id`
     - `idx_connections_met_at_event_id` on `met_at_event_id`

  6. **direct_messages table**
     - `idx_direct_messages_sender_id` on `sender_id`
     - `idx_direct_messages_shared_topic_id` on `shared_topic_id`

  7. **event_attendees table**
     - `idx_event_attendees_user_id` on `user_id`

  8. **event_invitations table**
     - `idx_event_invitations_inviter_id` on `inviter_id`

  9. **events table**
     - `idx_events_discussion_leader_id` on `discussion_leader_id`
     - `idx_events_hospitality_coordinator_id` on `hospitality_coordinator_id`
     - `idx_events_host_id` on `host_id`
     - `idx_events_location_id` on `location_id`
     - `idx_events_prayer_leader_id` on `prayer_leader_id`
     - `idx_events_worship_leader_id` on `worship_leader_id`

  10. **food_items table**
      - `idx_food_items_assigned_to` on `assigned_to`
      - `idx_food_items_event_id` on `event_id`

  11. **hashtag_follows table**
      - `idx_hashtag_follows_hashtag_id` on `hashtag_id`

  12. **locations table**
      - `idx_locations_host_id` on `host_id`

  13. **notifications table**
      - `idx_notifications_event_id` on `event_id`

  14. **order_items table**
      - `idx_order_items_product_id` on `product_id`

  15. **reports table**
      - `idx_reports_reported_event_id` on `reported_event_id`
      - `idx_reports_reported_location_id` on `reported_location_id`
      - `idx_reports_reported_user_id` on `reported_user_id`
      - `idx_reports_reporter_id` on `reporter_id`
      - `idx_reports_resolved_by` on `resolved_by`

  16. **topics table**
      - `idx_topics_author_id` on `author_id`

  17. **worship_songs table**
      - `idx_worship_songs_event_id` on `event_id`
*/

-- blocked_users
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);

-- bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_topic_id ON bookmarks(topic_id);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_topic_id ON comments(topic_id);

-- connection_requests
CREATE INDEX IF NOT EXISTS idx_connection_requests_event_id ON connection_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_to_user_id ON connection_requests(to_user_id);

-- connections
CREATE INDEX IF NOT EXISTS idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_met_at_event_id ON connections(met_at_event_id);

-- direct_messages
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_shared_topic_id ON direct_messages(shared_topic_id);

-- event_attendees
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);

-- event_invitations
CREATE INDEX IF NOT EXISTS idx_event_invitations_inviter_id ON event_invitations(inviter_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_discussion_leader_id ON events(discussion_leader_id);
CREATE INDEX IF NOT EXISTS idx_events_hospitality_coordinator_id ON events(hospitality_coordinator_id);
CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_location_id ON events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_prayer_leader_id ON events(prayer_leader_id);
CREATE INDEX IF NOT EXISTS idx_events_worship_leader_id ON events(worship_leader_id);

-- food_items
CREATE INDEX IF NOT EXISTS idx_food_items_assigned_to ON food_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_food_items_event_id ON food_items(event_id);

-- hashtag_follows
CREATE INDEX IF NOT EXISTS idx_hashtag_follows_hashtag_id ON hashtag_follows(hashtag_id);

-- locations
CREATE INDEX IF NOT EXISTS idx_locations_host_id ON locations(host_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_reported_event_id ON reports(reported_event_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_location_id ON reports(reported_location_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON reports(resolved_by);

-- topics
CREATE INDEX IF NOT EXISTS idx_topics_author_id ON topics(author_id);

-- worship_songs
CREATE INDEX IF NOT EXISTS idx_worship_songs_event_id ON worship_songs(event_id);
