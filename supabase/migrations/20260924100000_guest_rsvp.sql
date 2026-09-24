/*
  # Guest RSVP — anonymous visitors RSVP & unlock the location via a link

  Lets someone with an event link RSVP without an account and see the exact
  location, including private events when the link carries the invite code.
  Guests are view/RSVP only — they use the anon API role and have no other
  grants, so help/volunteer/team/chat/posting are structurally impossible.

  Reuses can_manage_event (20260901000000_general_polls.sql) for host/cohost checks.
  Idempotent.
*/

-- A. Host opt-out toggle (default on).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS allow_guest_rsvp boolean NOT NULL DEFAULT true;

-- B. Guest RSVP records. Guests can't go in event_attendees (user_id FK → users).
CREATE TABLE IF NOT EXISTS public.guest_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  guest_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);
CREATE INDEX IF NOT EXISTS idx_guest_rsvps_event ON public.guest_rsvps(event_id, created_at DESC);

ALTER TABLE public.guest_rsvps ENABLE ROW LEVEL SECURITY;

-- Only the host/co-hosts can read their event's guest list. All writes go
-- through the SECURITY DEFINER RPC below (no insert/update/delete policies).
DROP POLICY IF EXISTS "Hosts read guest rsvps" ON public.guest_rsvps;
CREATE POLICY "Hosts read guest rsvps" ON public.guest_rsvps FOR SELECT TO authenticated
  USING (public.can_manage_event(event_id, auth.uid()));

-- C. RPCs (anon-callable)

-- Landing view: event basics WITHOUT the address. Public events are open;
-- private/friends events require a matching invite code.
CREATE OR REPLACE FUNCTION public.guest_view_event(p_event_id uuid, p_invite_code text)
RETURNS SETOF public.events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vis text; v_code text;
BEGIN
  SELECT visibility, invite_code INTO v_vis, v_code FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF COALESCE(v_vis, 'public') <> 'public' THEN
    IF p_invite_code IS NULL OR v_code IS NULL OR p_invite_code <> v_code THEN RETURN; END IF;
  END IF;
  RETURN QUERY SELECT * FROM public.events WHERE id = p_event_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.guest_view_event(uuid, text) TO anon, authenticated;

-- Record a guest RSVP and return the unlocked location.
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

-- Host-facing guest headcount (0 for non-managers).
CREATE OR REPLACE FUNCTION public.event_guest_count(p_event_id uuid)
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.guest_rsvps g
  WHERE g.event_id = p_event_id AND public.can_manage_event(p_event_id, auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.event_guest_count(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
