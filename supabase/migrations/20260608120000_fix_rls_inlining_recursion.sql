/*
  # Fix recurring RLS recursion — switch helpers from LANGUAGE sql to plpgsql

  The recursion error returned because plain `LANGUAGE sql` SECURITY DEFINER
  functions are eligible for **inlining** by the Postgres planner. When the
  planner inlines `is_conversation_participant(conversation_id, auth.uid())`
  inside the policy USING clause, the inner SELECT runs as part of the same
  outer query — under the same RLS policy — and you get infinite recursion.

  `LANGUAGE plpgsql` functions are opaque to the planner: they cannot be
  inlined, so the SECURITY DEFINER bypass actually takes effect.

  This migration drops all six helpers, recreates them in plpgsql, and
  restores every policy that depended on them via CASCADE.
*/

-- ----------------------------------------------------------------------------
-- Helpers (plpgsql so the planner can't inline them)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_conversation_participant(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.is_event_attendee(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.is_event_attendee(p_event_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.event_attendees
    WHERE event_id = p_event_id AND user_id = p_user_id
      AND status IN ('registered', 'attended')
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_event_attendee(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.is_event_cohost(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.is_event_cohost(p_event_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.event_cohosts WHERE event_id = p_event_id AND user_id = p_user_id) INTO v_exists;
  RETURN v_exists;
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_event_cohost(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.is_event_cohost_editor(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.is_event_cohost_editor(p_event_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.event_cohosts WHERE event_id = p_event_id AND user_id = p_user_id AND can_edit = true) INTO v_exists;
  RETURN v_exists;
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_event_cohost_editor(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.users_are_connected(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.users_are_connected(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'active'
      AND ((user_id = p_a AND connected_user_id = p_b) OR (user_id = p_b AND connected_user_id = p_a))
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;
GRANT EXECUTE ON FUNCTION public.users_are_connected(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.can_user_see_event(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.can_user_see_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_can boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND (
        e.visibility = 'public'
        OR e.visibility = 'private'
        OR e.host_id = p_user_id
        OR public.is_event_cohost(e.id, p_user_id)
        OR public.is_event_attendee(e.id, p_user_id)
        OR (e.visibility = 'friends_only' AND public.users_are_connected(e.host_id, p_user_id))
      )
  ) INTO v_can;
  RETURN v_can;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_user_see_event(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- Restore policies that CASCADE dropped
-- ----------------------------------------------------------------------------
CREATE POLICY "Participants can read fellow participants"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Participants can read their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Participants can read messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Events: public, host, cohost, attendee, friend"
  ON public.events FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR visibility = 'private'
    OR host_id = auth.uid()
    OR public.is_event_cohost(id, auth.uid())
    OR public.is_event_attendee(id, auth.uid())
    OR (visibility = 'friends_only' AND public.users_are_connected(host_id, auth.uid()))
  );

CREATE POLICY "Anon can read public events"
  ON public.events FOR SELECT TO anon
  USING (visibility = 'public');

CREATE POLICY "Host or editor can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (host_id = auth.uid() OR public.is_event_cohost_editor(id, auth.uid()));

CREATE POLICY "Users can RSVP to events they can see"
  ON public.event_attendees FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_user_see_event(event_id, auth.uid())
  );

CREATE POLICY "Attendees, hosts and co-hosts can read attendees"
  ON public.event_attendees FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_attendees.event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_cohosts c WHERE c.event_id = event_attendees.event_id AND c.user_id = auth.uid())
    OR public.is_event_attendee(event_attendees.event_id, auth.uid())
  );

CREATE POLICY "Event participants can read help requests"
  ON public.event_help_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_help_requests.event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_cohosts c WHERE c.event_id = event_help_requests.event_id AND c.user_id = auth.uid())
    OR public.is_event_attendee(event_help_requests.event_id, auth.uid())
  );

CREATE POLICY "Event participants can view cohosts"
  ON public.event_cohosts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_cohosts.event_id AND e.host_id = auth.uid())
    OR public.is_event_attendee(event_cohosts.event_id, auth.uid())
  );

CREATE POLICY "Locations visible to authorized event viewers"
  ON public.locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.location_id = locations.id
        AND public.can_user_see_event(e.id, auth.uid())
        AND (
          e.host_id = auth.uid()
          OR public.is_event_cohost(e.id, auth.uid())
          OR e.address_visibility = 'public'
          OR (e.address_visibility = 'attendees_only' AND public.is_event_attendee(e.id, auth.uid()))
        )
    )
  );

CREATE POLICY "Anon sees locations of fully public events"
  ON public.locations FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.location_id = locations.id
        AND e.visibility = 'public'
        AND e.address_visibility = 'public'
    )
  );

NOTIFY pgrst, 'reload schema';
