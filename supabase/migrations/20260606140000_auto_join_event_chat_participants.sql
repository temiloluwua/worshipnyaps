/*
  # Auto-join event chat on RSVP, co-host add, or late chat creation

  Problem: the new "Send to event group chat" picker in ShareModal only
  surfaces conversations the user is already a participant in. RSVPing
  doesn't currently put you in the event chat — you only get added when
  you open the event detail page and the client calls
  ensureConversationParticipant() defensively. That means until a user
  opens the event, they're invisible to the chat (and to this picker).

  Fix: three SECURITY DEFINER triggers that keep
  conversation_participants in sync with event reality:

  1. event_attendees AFTER INSERT/UPDATE → add the attendee to the event's
     conversation, if one exists, whenever status is registered/attended.
  2. event_cohosts AFTER INSERT → add the co-host to the event's
     conversation, if one exists.
  3. conversations AFTER INSERT (where event_id is not null) → populate
     the new chat with the event's host, all co-hosts, and all
     currently-registered attendees.

  All inserts guard against duplicates with NOT EXISTS so they don't
  require a unique constraint on (conversation_id, user_id).

  We also backfill once at the end so existing event chats catch up.
*/

-- ----------------------------------------------------------------------------
-- 1. Attendee RSVP → join event chat
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_attendee_to_event_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('registered', 'attended') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.conversations c
  WHERE c.event_id = NEW.event_id
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id AND cp.user_id = NEW.user_id
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendee_join_event_chat ON public.event_attendees;
CREATE TRIGGER attendee_join_event_chat
  AFTER INSERT OR UPDATE OF status ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.add_attendee_to_event_chat();

-- ----------------------------------------------------------------------------
-- 2. Co-host added → join event chat
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_cohost_to_event_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.conversations c
  WHERE c.event_id = NEW.event_id
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id AND cp.user_id = NEW.user_id
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cohost_join_event_chat ON public.event_cohosts;
CREATE TRIGGER cohost_join_event_chat
  AFTER INSERT ON public.event_cohosts
  FOR EACH ROW
  EXECUTE FUNCTION public.add_cohost_to_event_chat();

-- ----------------------------------------------------------------------------
-- 3. Event chat created → backfill host + co-hosts + registered attendees
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.populate_event_chat_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Host
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT NEW.id, e.host_id
  FROM public.events e
  WHERE e.id = NEW.event_id
    AND e.host_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = NEW.id AND cp.user_id = e.host_id
    );

  -- Co-hosts
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT NEW.id, ec.user_id
  FROM public.event_cohosts ec
  WHERE ec.event_id = NEW.event_id
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = NEW.id AND cp.user_id = ec.user_id
    );

  -- Registered/attended RSVPs
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT NEW.id, ea.user_id
  FROM public.event_attendees ea
  WHERE ea.event_id = NEW.event_id
    AND ea.status IN ('registered', 'attended')
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = NEW.id AND cp.user_id = ea.user_id
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_chat_populate_participants ON public.conversations;
CREATE TRIGGER event_chat_populate_participants
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  WHEN (NEW.event_id IS NOT NULL)
  EXECUTE FUNCTION public.populate_event_chat_participants();

-- ----------------------------------------------------------------------------
-- 4. One-time backfill for existing event chats
-- ----------------------------------------------------------------------------
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, e.host_id
FROM public.conversations c
JOIN public.events e ON e.id = c.event_id
WHERE c.event_id IS NOT NULL
  AND e.host_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = e.host_id
  );

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, ec.user_id
FROM public.conversations c
JOIN public.event_cohosts ec ON ec.event_id = c.event_id
WHERE c.event_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = ec.user_id
  );

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, ea.user_id
FROM public.conversations c
JOIN public.event_attendees ea ON ea.event_id = c.event_id
WHERE c.event_id IS NOT NULL
  AND ea.status IN ('registered', 'attended')
  AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = ea.user_id
  );

NOTIFY pgrst, 'reload schema';
