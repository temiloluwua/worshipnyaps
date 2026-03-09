/*
  # Core RLS Subselect Optimization

  Optimizes RLS policies by using (select auth.uid()) instead of direct auth.uid() calls.
  This prevents function re-evaluation per row and improves performance at scale.
*/

DROP POLICY IF EXISTS "Hosts can create events" ON public.events;
CREATE POLICY "Hosts can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Hosts can update own events" ON public.events;
CREATE POLICY "Hosts can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (host_id = (select auth.uid()))
  WITH CHECK (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read public events and own events" ON public.events;
CREATE POLICY "Users can read public events and own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (visibility = 'public' OR host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;
CREATE POLICY "Authors can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Authors can update own comments" ON public.comments;
CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can register for events" ON public.event_attendees;
CREATE POLICY "Users can register for events"
  ON public.event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own registrations" ON public.event_attendees;
CREATE POLICY "Users can update own registrations"
  ON public.event_attendees FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can cancel own registrations" ON public.event_attendees;
CREATE POLICY "Users can cancel own registrations"
  ON public.event_attendees FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Anyone can read public event attendees" ON public.event_attendees;
CREATE POLICY "Anyone can read public event attendees"
  ON public.event_attendees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_attendees.event_id 
      AND (events.visibility = 'public' OR events.host_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create topics" ON public.topics;
CREATE POLICY "Users can create topics"
  ON public.topics FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Authors can delete own topics" ON public.topics;
CREATE POLICY "Authors can delete own topics"
  ON public.topics FOR DELETE
  TO authenticated
  USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Authors can update own topics safely" ON public.topics;
CREATE POLICY "Authors can update own topics safely"
  ON public.topics FOR UPDATE
  TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all topics" ON public.topics;
CREATE POLICY "Admins can manage all topics"
  ON public.topics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can read volunteer roles" ON public.volunteer_roles;
CREATE POLICY "Users can read volunteer roles"
  ON public.volunteer_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can manage own volunteer roles" ON public.volunteer_roles;
CREATE POLICY "Users can manage own volunteer roles"
  ON public.volunteer_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own volunteer roles" ON public.volunteer_roles;
CREATE POLICY "Users can update own volunteer roles"
  ON public.volunteer_roles FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own volunteer roles" ON public.volunteer_roles;
CREATE POLICY "Users can delete own volunteer roles"
  ON public.volunteer_roles FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read their own connections" ON public.connections;
CREATE POLICY "Users can read their own connections"
  ON public.connections FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR connected_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create connections" ON public.connections;
CREATE POLICY "Users can create connections"
  ON public.connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own connections" ON public.connections;
CREATE POLICY "Users can update their own connections"
  ON public.connections FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()) OR connected_user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()) OR connected_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own connections" ON public.connections;
CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()) OR connected_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read their connection requests" ON public.connection_requests;
CREATE POLICY "Users can read their connection requests"
  ON public.connection_requests FOR SELECT
  TO authenticated
  USING (from_user_id = (select auth.uid()) OR to_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create connection requests" ON public.connection_requests;
CREATE POLICY "Users can create connection requests"
  ON public.connection_requests FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update requests they received" ON public.connection_requests;
CREATE POLICY "Users can update requests they received"
  ON public.connection_requests FOR UPDATE
  TO authenticated
  USING (to_user_id = (select auth.uid()))
  WITH CHECK (to_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read their own reports" ON public.reports;
CREATE POLICY "Users can read their own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can read all reports" ON public.reports;
CREATE POLICY "Admins can read all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read community chat" ON public.chat_messages;
CREATE POLICY "Users can read community chat"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (channel = 'community');

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their invitations" ON public.event_invitations;
CREATE POLICY "Users can view their invitations"
  ON public.event_invitations FOR SELECT
  TO authenticated
  USING (invitee_id = (select auth.uid()) OR inviter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send invitations" ON public.event_invitations;
CREATE POLICY "Users can send invitations"
  ON public.event_invitations FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Invitees can respond to invitations" ON public.event_invitations;
CREATE POLICY "Invitees can respond to invitations"
  ON public.event_invitations FOR UPDATE
  TO authenticated
  USING (invitee_id = (select auth.uid()))
  WITH CHECK (invitee_id = (select auth.uid()));

DROP POLICY IF EXISTS "Inviters can delete invitations" ON public.event_invitations;
CREATE POLICY "Inviters can delete invitations"
  ON public.event_invitations FOR DELETE
  TO authenticated
  USING (inviter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their blocked users" ON public.blocked_users;
CREATE POLICY "Users can view their blocked users"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR blocked_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can block others" ON public.blocked_users;
CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their blocks" ON public.blocked_users;
CREATE POLICY "Users can update their blocks"
  ON public.blocked_users FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unblock others" ON public.blocked_users;
CREATE POLICY "Users can unblock others"
  ON public.blocked_users FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own reposts" ON public.reposts;
CREATE POLICY "Users can create own reposts"
  ON public.reposts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own reposts" ON public.reposts;
CREATE POLICY "Users can delete own reposts"
  ON public.reposts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own likes" ON public.likes;
CREATE POLICY "Users can create own likes"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own likes" ON public.likes;
CREATE POLICY "Users can delete own likes"
  ON public.likes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own reactions" ON public.reactions;
CREATE POLICY "Users can create own reactions"
  ON public.reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.reactions;
CREATE POLICY "Users can delete own reactions"
  ON public.reactions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create own bookmarks"
  ON public.bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own hashtag follows" ON public.hashtag_follows;
CREATE POLICY "Users can view own hashtag follows"
  ON public.hashtag_follows FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can follow hashtags" ON public.hashtag_follows;
CREATE POLICY "Users can follow hashtags"
  ON public.hashtag_follows FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unfollow hashtags" ON public.hashtag_follows;
CREATE POLICY "Users can unfollow hashtags"
  ON public.hashtag_follows FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view activities involving them" ON public.activity_feed;
CREATE POLICY "Users can view activities involving them"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR target_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own activities" ON public.activity_feed;
CREATE POLICY "Users can create own activities"
  ON public.activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile safely" ON public.users;
CREATE POLICY "Users can update own profile safely"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Event hosts can create help requests" ON public.event_help_requests;
CREATE POLICY "Event hosts can create help requests"
  ON public.event_help_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_id 
      AND events.host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Event hosts can update help requests" ON public.event_help_requests;
CREATE POLICY "Event hosts can update help requests"
  ON public.event_help_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_help_requests.event_id 
      AND events.host_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_id 
      AND events.host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can volunteer for help requests" ON public.event_help_requests;
CREATE POLICY "Authenticated users can volunteer for help requests"
  ON public.event_help_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (assigned_user_id = (select auth.uid()) OR assigned_user_id IS NULL);

DROP POLICY IF EXISTS "Event hosts can delete help requests" ON public.event_help_requests;
CREATE POLICY "Event hosts can delete help requests"
  ON public.event_help_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_help_requests.event_id 
      AND events.host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view their own topic requests" ON public.topic_requests;
CREATE POLICY "Users can view their own topic requests"
  ON public.topic_requests FOR SELECT
  TO authenticated
  USING (requested_by = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all topic requests" ON public.topic_requests;
CREATE POLICY "Admins can view all topic requests"
  ON public.topic_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create topic requests" ON public.topic_requests;
CREATE POLICY "Authenticated users can create topic requests"
  ON public.topic_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update topic requests" ON public.topic_requests;
CREATE POLICY "Admins can update topic requests"
  ON public.topic_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (select auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their own customer data" ON public.stripe_customers;
CREATE POLICY "Users can view their own customer data"
  ON public.stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));
