/*
  # Friends-of-friends event visibility

  Adds a 'friends_of_friends' visibility: the event is visible to the host's
  direct connections AND their mutuals (friends of friends). Because visibility
  is what surfaces an event in a viewer's feed, this also makes the event "show
  up for your mutuals."

  - events.visibility CHECK gains 'friends_of_friends'
  - users_are_friends_or_fof(a, b): direct connection OR a shared mutual
  - events SELECT policy, can_user_see_event(), and its dependent policies
    (RSVP insert, locations select) all honor the new value
*/

-- 1. Allow the new visibility value
DO $$
BEGIN
  ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_visibility_check;
  ALTER TABLE public.events ADD CONSTRAINT events_visibility_check
    CHECK (visibility IN ('public', 'private', 'friends_only', 'friends_of_friends'));
EXCEPTION WHEN others THEN RAISE NOTICE 'skip events_visibility_check: %', SQLERRM; END $$;

-- 2. Friend-or-friend-of-friend helper (SECURITY DEFINER — no RLS recursion)
CREATE OR REPLACE FUNCTION public.users_are_friends_or_fof(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p_a = p_b
    OR public.users_are_connected(p_a, p_b)
    OR EXISTS (
      -- a mutual X where b is connected to X and X is connected to a
      SELECT 1
      FROM connections c1
      JOIN connections c2 ON c2.user_id = c1.connected_user_id
      WHERE c1.user_id = p_b AND c1.status = 'active'
        AND c2.connected_user_id = p_a AND c2.status = 'active'
        AND c1.connected_user_id <> p_a
        AND c1.connected_user_id <> p_b
    );
$$;
GRANT EXECUTE ON FUNCTION public.users_are_friends_or_fof(uuid, uuid) TO authenticated;

-- 3. Events SELECT policy
DROP POLICY IF EXISTS "Events: public, host, cohost, attendee, friend" ON public.events;
CREATE POLICY "Events: public, host, cohost, attendee, friend"
  ON public.events FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR public.is_event_cohost(id, auth.uid())
    OR public.is_event_attendee(id, auth.uid())
    OR (visibility = 'friends_only' AND public.users_are_connected(host_id, auth.uid()))
    OR (visibility = 'friends_of_friends' AND public.users_are_friends_or_fof(host_id, auth.uid()))
  );

-- 4. can_user_see_event() + recreate its dependent policies (CASCADE drop)
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
        OR e.host_id = p_user_id
        OR public.is_event_cohost(e.id, p_user_id)
        OR public.is_event_attendee(e.id, p_user_id)
        OR (e.visibility = 'friends_only' AND public.users_are_connected(e.host_id, p_user_id))
        OR (e.visibility = 'friends_of_friends' AND public.users_are_friends_or_fof(e.host_id, p_user_id))
      )
  ) INTO v_can;
  RETURN v_can;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_user_see_event(uuid, uuid) TO authenticated;

CREATE POLICY "Users can RSVP to events they can see"
  ON public.event_attendees FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_user_see_event(event_id, auth.uid())
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

NOTIFY pgrst, 'reload schema';
