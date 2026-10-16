/*
  # Block RSVPs to events that have already ended

  You could previously RSVP to a past event: neither the RSVP RPCs nor the UI
  checked the event date. This adds a server-side backstop so stale clients and
  direct API calls can't register for an event that's over, across all three
  RSVP entry points:
    - claim_event_seat     (signed-in, capacity/waitlist aware)
    - guest_rsvp_to_event  (anonymous invite-link guests)
    - claim_event_invite   (signed-in private invite link)

  Events store `date date` + `time time` with NO timezone (naive local time,
  Calgary ≈ UTC-6/-7) while now() is UTC. To guarantee we never reject an RSVP
  the client UI would still allow, event_has_ended() uses a 12-hour margin:
  that absorbs the timezone offset plus the app's ~6-hour post-start grace
  (isEventPast in src/hooks/useEvents.ts). The UI stays the primary gate; this
  is defense in depth. Idempotent.
*/

-- Single source of truth for "is this event over?" (NULL when not found, which
-- callers treat as "not ended" — they raise their own 'Event not found').
CREATE OR REPLACE FUNCTION public.event_has_ended(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (e.date + e.time) < (now() - interval '12 hours')
  FROM public.events e WHERE e.id = p_event_id;
$$;
GRANT EXECUTE ON FUNCTION public.event_has_ended(uuid) TO anon, authenticated;

-- A. claim_event_seat — add the ended-check after the idempotent "already
--    holding a seat" return so existing attendees re-calling never error.
CREATE OR REPLACE FUNCTION public.claim_event_seat(p_event_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_capacity int;
  v_registered int;
  v_current text;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;

  -- Lock the event row so concurrent claims for this event serialize.
  SELECT capacity INTO v_capacity FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  -- This is SECURITY DEFINER, so it bypasses the event_attendees INSERT RLS
  -- policy. Re-check the same authorization that policy enforces so nobody can
  -- register for an event they aren't allowed to see. (Private invite-link
  -- RSVPs go through claim_event_invite, which validates the code instead.)
  IF NOT public.can_user_see_event(p_event_id, v_uid) THEN
    RAISE EXCEPTION 'Not permitted to RSVP to this event';
  END IF;

  -- Already holding a confirmed or waitlisted seat? Keep it (idempotent).
  SELECT status INTO v_current
  FROM public.event_attendees
  WHERE event_id = p_event_id AND user_id = v_uid;
  IF v_current IN ('registered', 'waitlisted') THEN
    RETURN v_current;
  END IF;

  -- No new RSVPs once the event is over.
  IF public.event_has_ended(p_event_id) THEN
    RAISE EXCEPTION 'This event has already ended';
  END IF;

  -- Count confirmed attendees (excludes this user, who is cancelled/absent here).
  SELECT COUNT(*) INTO v_registered
  FROM public.event_attendees
  WHERE event_id = p_event_id AND status = 'registered';

  IF v_capacity IS NULL OR v_capacity <= 0 OR v_registered < v_capacity THEN
    v_status := 'registered';
  ELSE
    v_status := 'waitlisted';
  END IF;

  INSERT INTO public.event_attendees (event_id, user_id, status, registered_at)
  VALUES (p_event_id, v_uid, v_status, now())
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = EXCLUDED.status, registered_at = now();

  RETURN v_status;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_event_seat(uuid) TO authenticated;

-- B. guest_rsvp_to_event — block after existence/visibility checks.
CREATE OR REPLACE FUNCTION public.guest_rsvp_to_event(
  p_event_id uuid, p_invite_code text, p_name text, p_email text
)
RETURNS TABLE (guest_token uuid, location_name text, address text, latitude double precision, longitude double precision)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vis text; v_code text; v_allow boolean; v_loc uuid; v_token uuid;
  v_name text := btrim(COALESCE(p_name, ''));
  v_email text := lower(btrim(COALESCE(p_email, '')));
BEGIN
  IF v_name = '' THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'A valid email is required'; END IF;

  SELECT visibility, invite_code, allow_guest_rsvp, location_id
    INTO v_vis, v_code, v_allow, v_loc
    FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF NOT COALESCE(v_allow, true) THEN RAISE EXCEPTION 'This event is not open to guest RSVPs'; END IF;
  IF COALESCE(v_vis, 'public') <> 'public' THEN
    IF p_invite_code IS NULL OR v_code IS NULL OR p_invite_code <> v_code THEN
      RAISE EXCEPTION 'This event requires a valid invite link';
    END IF;
  END IF;
  IF public.event_has_ended(p_event_id) THEN
    RAISE EXCEPTION 'This event has already ended';
  END IF;

  INSERT INTO public.guest_rsvps (event_id, name, email)
  VALUES (p_event_id, v_name, v_email)
  ON CONFLICT (event_id, email) DO UPDATE SET name = EXCLUDED.name
  RETURNING guest_rsvps.guest_token INTO v_token;

  RETURN QUERY
    SELECT v_token, l.name, l.address, l.latitude::double precision, l.longitude::double precision
    FROM public.locations l WHERE l.id = v_loc;
  IF NOT FOUND THEN
    -- Event has no location row yet — still confirm the RSVP.
    RETURN QUERY SELECT v_token, NULL::text, NULL::text, NULL::double precision, NULL::double precision;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.guest_rsvp_to_event(uuid, text, text, text) TO anon, authenticated;

-- C. claim_event_invite — block after the invite code validates.
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

  IF public.event_has_ended(p_event_id) THEN
    RAISE EXCEPTION 'This event has already ended';
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
