/*
  # Event waitlist — full events queue instead of rejecting

  When an event reaches capacity, further RSVPs join a waitlist rather than
  being turned away. If a confirmed attendee cancels, the earliest waitlisted
  person is auto-promoted to registered and notified (→ push).

  Correctness: the seat decision is made in the DB under a row lock on the
  event, so two people racing for the last seat can't both get 'registered'.
  Capacity of NULL or <= 0 means "no limit" — everyone is registered, the
  waitlist never engages.

  Idempotent.
*/

-- A. Allow the 'waitlisted' attendee status.
ALTER TABLE public.event_attendees DROP CONSTRAINT IF EXISTS event_attendees_status_check;
ALTER TABLE public.event_attendees ADD CONSTRAINT event_attendees_status_check
  CHECK (status IN ('registered', 'attended', 'cancelled', 'waitlisted'));

-- B. Allow the promotion notification type (re-declare the full allow-list).
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'general', 'event_reminder', 'connection_request', 'connection_accepted',
    'volunteer_opportunity', 'event_update', 'event', 'comment',
    'rsvp', 'dm', 'role_request', 'cohost_added', 'waitlist_promoted'
  ));

-- C. Claim a seat: register if there's room, otherwise waitlist. Returns the
-- resulting status ('registered' | 'waitlisted'). Serializes concurrent claims
-- for the same event via FOR UPDATE on the event row.
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

-- D. Auto-promote the earliest waitlisted person when a confirmed seat frees.
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_id uuid;
  v_capacity int;
  v_registered int;
  v_event_title text;
  v_promoted_user uuid;
BEGIN
  -- A confirmed seat is freed by a registered row being cancelled or deleted.
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'registered' THEN RETURN OLD; END IF;
    v_event_id := OLD.event_id;
  ELSE
    IF NOT (OLD.status = 'registered' AND NEW.status <> 'registered') THEN
      RETURN NEW;
    END IF;
    v_event_id := NEW.event_id;
  END IF;

  SELECT capacity, title INTO v_capacity, v_event_title
  FROM public.events WHERE id = v_event_id;
  -- Unlimited events never build a waitlist.
  IF v_capacity IS NULL OR v_capacity <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_registered
  FROM public.event_attendees
  WHERE event_id = v_event_id AND status = 'registered';
  IF v_registered >= v_capacity THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Promote the earliest waitlisted person. (waitlisted→registered doesn't
  -- re-trigger the "seat freed" branch above, so there's no recursion.)
  UPDATE public.event_attendees
  SET status = 'registered'
  WHERE id = (
    SELECT id FROM public.event_attendees
    WHERE event_id = v_event_id AND status = 'waitlisted'
    ORDER BY registered_at ASC
    LIMIT 1
  )
  RETURNING user_id INTO v_promoted_user;

  IF v_promoted_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      v_promoted_user,
      'waitlist_promoted',
      'A spot opened up — you''re in!',
      'You''re now confirmed for ' || COALESCE(v_event_title, 'the event') || '.',
      jsonb_build_object('event_id', v_event_id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS event_attendee_waitlist_promote ON public.event_attendees;
CREATE TRIGGER event_attendee_waitlist_promote
  AFTER UPDATE OR DELETE ON public.event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.promote_from_waitlist();

NOTIFY pgrst, 'reload schema';
