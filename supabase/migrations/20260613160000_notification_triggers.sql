/*
  # Auto-create notifications for the key social events

  Currently notifications are only inserted when client code explicitly
  asks (one spot in EventHelpRequests). That means most actions in the
  app — RSVPing, getting a connection request, getting a comment, getting
  a DM — leave the recipient with no notification trail.

  This migration adds BEFORE/AFTER INSERT triggers that auto-create rows
  in the notifications table for:

  1. Connection request received → notify the recipient
  2. Connection accepted (status flipped to 'active') → notify the requester
  3. New comment on your topic → notify the topic author
  4. RSVP to your event → notify the host
  5. New DM → notify the other participants in the conversation
  6. Event invite (co-host added) → notify the new co-host

  All triggers are SECURITY DEFINER so they can write to notifications
  regardless of RLS. They no-op when the action is self-directed
  (don't notify yourself).

  Notification type values added to the CHECK constraint as needed.
*/

-- Allow the new notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'general', 'event_reminder', 'connection_request', 'connection_accepted',
    'volunteer_opportunity', 'event_update', 'event', 'comment',
    'rsvp', 'dm', 'role_request', 'cohost_added'
  ));

-- ----------------------------------------------------------------------------
-- 1. Connection request received
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_connection_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender_name text;
BEGIN
  IF NEW.from_user_id = NEW.to_user_id THEN RETURN NEW; END IF;
  SELECT name INTO v_sender_name FROM public.users WHERE id = NEW.from_user_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    NEW.to_user_id,
    'connection_request',
    COALESCE(v_sender_name, 'Someone') || ' wants to connect with you',
    COALESCE(NEW.message, ''),
    jsonb_build_object('user_id', NEW.from_user_id, 'request_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connection_request_notification ON public.connection_requests;
CREATE TRIGGER connection_request_notification
  AFTER INSERT ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_request();

-- ----------------------------------------------------------------------------
-- 2. Connection accepted (active connection row created)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_connection_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_other_name text;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF NEW.user_id = NEW.connected_user_id THEN RETURN NEW; END IF;
  SELECT name INTO v_other_name FROM public.users WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    NEW.connected_user_id,
    'connection_accepted',
    COALESCE(v_other_name, 'Someone') || ' connected with you',
    'You can now message each other and see private posts.',
    jsonb_build_object('user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connection_accepted_notification ON public.connections;
CREATE TRIGGER connection_accepted_notification
  AFTER INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_accepted();

-- ----------------------------------------------------------------------------
-- 3. New comment on your topic
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_topic_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_topic_author uuid;
  v_topic_title text;
  v_commenter_name text;
BEGIN
  SELECT author_id, title INTO v_topic_author, v_topic_title FROM public.topics WHERE id = NEW.topic_id;
  IF v_topic_author IS NULL OR v_topic_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT name INTO v_commenter_name FROM public.users WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    v_topic_author,
    'comment',
    COALESCE(v_commenter_name, 'Someone') || ' commented on your post',
    LEFT(COALESCE(NEW.content, ''), 140),
    jsonb_build_object('topic_id', NEW.topic_id, 'comment_id', NEW.id, 'user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS topic_comment_notification ON public.comments;
CREATE TRIGGER topic_comment_notification
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_topic_comment();

-- ----------------------------------------------------------------------------
-- 4. New RSVP to your event
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_event_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host uuid;
  v_event_title text;
  v_attendee_name text;
BEGIN
  IF NEW.status <> 'registered' THEN RETURN NEW; END IF;
  SELECT host_id, title INTO v_host, v_event_title FROM public.events WHERE id = NEW.event_id;
  IF v_host IS NULL OR v_host = NEW.user_id THEN RETURN NEW; END IF;
  SELECT name INTO v_attendee_name FROM public.users WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    v_host,
    'rsvp',
    COALESCE(v_attendee_name, 'Someone') || ' RSVPed to ' || COALESCE(v_event_title, 'your event'),
    '',
    jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_rsvp_notification ON public.event_attendees;
CREATE TRIGGER event_rsvp_notification
  AFTER INSERT ON public.event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_rsvp();

-- ----------------------------------------------------------------------------
-- 5. New DM (notifies other participants)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name text;
  v_recipient uuid;
BEGIN
  SELECT name INTO v_sender_name FROM public.users WHERE id = NEW.sender_id;
  FOR v_recipient IN
    SELECT cp.user_id FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      v_recipient,
      'dm',
      COALESCE(v_sender_name, 'Someone') || ' sent you a message',
      LEFT(COALESCE(NEW.content, ''), 140),
      jsonb_build_object('conversation_id', NEW.conversation_id, 'user_id', NEW.sender_id, 'message_id', NEW.id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS direct_message_notification ON public.direct_messages;
CREATE TRIGGER direct_message_notification
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();

-- ----------------------------------------------------------------------------
-- 6. Added as a co-host on an event
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_cohost_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host_name text;
  v_event_title text;
  v_host_id uuid;
BEGIN
  SELECT host_id, title INTO v_host_id, v_event_title FROM public.events WHERE id = NEW.event_id;
  IF NEW.user_id = v_host_id THEN RETURN NEW; END IF;
  SELECT name INTO v_host_name FROM public.users WHERE id = v_host_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    NEW.user_id,
    'cohost_added',
    COALESCE(v_host_name, 'A host') || ' invited you to co-host ' || COALESCE(v_event_title, 'an event'),
    '',
    jsonb_build_object('event_id', NEW.event_id, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cohost_added_notification ON public.event_cohosts;
CREATE TRIGGER cohost_added_notification
  AFTER INSERT ON public.event_cohosts
  FOR EACH ROW EXECUTE FUNCTION public.notify_cohost_added();

NOTIFY pgrst, 'reload schema';
