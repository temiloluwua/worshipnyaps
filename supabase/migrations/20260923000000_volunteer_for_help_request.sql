/*
  # One-tap "I'll help" from a volunteer-opportunity notification

  When a host sends a gift-matched volunteer ask (SuggestedHelpers →
  volunteer_opportunity notification), the recipient may not be an attendee and
  has no team-link code, so the existing claim_team_role RPC (which requires a
  team_code) can't be used. This RPC lets any authenticated recipient claim an
  open help request in one tap: it RSVPs them, assigns the role, and notifies
  the host — mirroring the effect of claim_team_role's 'help' branch without a code.

  Idempotent.
*/
CREATE OR REPLACE FUNCTION public.volunteer_for_help_request(p_item_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_event uuid; v_host uuid; v_title text; v_rows int; v_name text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT h.event_id, h.title, e.host_id
    INTO v_event, v_title, v_host
    FROM public.event_help_requests h JOIN public.events e ON e.id = h.event_id
    WHERE h.id = p_item_id;
  IF v_event IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  -- Offering to help implies attending.
  INSERT INTO public.event_attendees (event_id, user_id, status)
  VALUES (v_event, v_caller, 'registered')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'registered';

  UPDATE public.event_help_requests
     SET assigned_user_id = v_caller, status = 'filled'
   WHERE id = p_item_id AND event_id = v_event
     AND status = 'open' AND COALESCE(open_to_volunteers, true) = true;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'That role is no longer available'; END IF;

  SELECT name INTO v_name FROM public.users WHERE id = v_caller;
  INSERT INTO public.notifications (user_id, type, title, message, body, event_id, payload, is_read)
  VALUES (
    v_host, 'general', 'Someone offered to help',
    COALESCE(v_name, 'Someone') || ' is helping with "' || COALESCE(v_title, 'a task') || '"',
    COALESCE(v_name, 'Someone') || ' is helping with "' || COALESCE(v_title, 'a task') || '"',
    v_event, jsonb_build_object('event_id', v_event, 'item_id', p_item_id, 'user_id', v_caller), false
  );

  RETURN 'claimed';
END; $$;
GRANT EXECUTE ON FUNCTION public.volunteer_for_help_request(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
