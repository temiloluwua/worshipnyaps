/*
  # Hide private events from the public events feed

  Earlier we kept `visibility = 'private'` visible to anyone with the
  event UUID, treating it like a share-by-link secret. The user (correctly)
  flagged that private events still surface in lists and any random
  authenticated user can see them by guessing a UUID. Tighten:

  - Private events visible ONLY to host, co-hosts, and current attendees
  - Invitees with a URL like /event/<id>?invite=<code> can still claim
    access via a new SECURITY DEFINER RPC that validates the code and
    returns the event row. The client (EventDetailView) falls back to this
    RPC when the normal SELECT returns nothing.
*/

DROP POLICY IF EXISTS "Events: public, host, cohost, attendee, friend" ON public.events;

CREATE POLICY "Events: public, host, cohost, attendee, friend"
  ON public.events FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR public.is_event_cohost(id, auth.uid())
    OR public.is_event_attendee(id, auth.uid())
    OR (visibility = 'friends_only' AND public.users_are_connected(host_id, auth.uid()))
  );

-- can_user_see_event needs to drop the private bypass too so RSVP INSERTs
-- to private events are gated by the invite-code RPC, not bare event id
DROP FUNCTION IF EXISTS public.can_user_see_event(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.can_user_see_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      )
  ) INTO v_can;
  RETURN v_can;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_user_see_event(uuid, uuid) TO authenticated;

-- Recreate the policies that depended on can_user_see_event via CASCADE
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

-- New: SECURITY DEFINER RPC for invited users to fetch a private event
-- without the regular SELECT policy gating them. Returns the event row
-- only if the invite_code matches.
CREATE OR REPLACE FUNCTION public.get_event_by_invite_code(
  p_event_id uuid,
  p_invite_code text
)
RETURNS SETOF public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.events
  WHERE id = p_event_id
    AND invite_code = p_invite_code
    AND invite_code IS NOT NULL
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_by_invite_code(uuid, text) TO authenticated;

-- And let invited users RSVP using the invite code (otherwise the
-- RLS INSERT policy blocks them — they can see the event via the RPC
-- above but aren't yet an attendee, so can_user_see_event returns false)
CREATE OR REPLACE FUNCTION public.claim_event_invite(
  p_event_id uuid,
  p_invite_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendee_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate the invite code matches
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id
      AND invite_code = p_invite_code
      AND invite_code IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO public.event_attendees (event_id, user_id, status)
  VALUES (p_event_id, v_caller, 'registered')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'registered'
  RETURNING id INTO v_attendee_id;

  RETURN v_attendee_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_event_invite(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
