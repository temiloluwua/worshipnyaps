/*
  # Event team recruitment via shareable role links

  ## Why
  Hosts could only add co-hosts from their existing in-app connections, and
  helper roles / bring-items could only be claimed by people already in the
  event. There was no way to hand someone *outside the app* a link that lets
  them sign up and join the team. This adds shareable "team" links.

  ## What
  - events.team_code: a stable, auto-generated code embedded in team links.
  - event_cohost_requests: pending co-host claims from links. Co-hosts can
    message all attendees, so a link-claim must NOT grant powers until the
    host approves. Keeping pending claims in a SEPARATE table means none of
    the existing co-host-power policies (which read event_cohosts) apply
    until approval — no RLS audit needed.
  - claim_team_role(): SECURITY DEFINER claim past RLS (mirrors
    claim_event_invite). Registers the caller as an attendee, then either
    files a pending co-host request or claims a help role / bring-item.
  - approve_cohost_request(): host/editor approves → normal insert into
    event_cohosts (which triggers the existing chat auto-join).
  - get_team_board(): SECURITY DEFINER read gated by team_code so a not-yet-
    attendee visiting a link can see the open roles.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. events.team_code -------------------------------------------------------
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS team_code text;
UPDATE public.events SET team_code = encode(gen_random_bytes(6), 'hex') WHERE team_code IS NULL;
ALTER TABLE public.events ALTER COLUMN team_code SET DEFAULT encode(gen_random_bytes(6), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_team_code ON public.events(team_code);

-- 2. pending co-host requests ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text,
  custom_role_label text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_cohost_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_cohost_requests_event ON public.event_cohost_requests(event_id);

-- Host, editor co-hosts, and the requester can see a request. Inserts happen
-- only through claim_team_role (SECURITY DEFINER), so no INSERT policy.
DROP POLICY IF EXISTS "cohost_requests_select" ON public.event_cohost_requests;
CREATE POLICY "cohost_requests_select"
  ON public.event_cohost_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
    OR public.is_event_cohost_editor(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "cohost_requests_delete" ON public.event_cohost_requests;
CREATE POLICY "cohost_requests_delete"
  ON public.event_cohost_requests FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
    OR public.is_event_cohost_editor(event_id, auth.uid())
  );

-- 3. claim_team_role --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_team_role(
  p_event_id uuid,
  p_team_code text,
  p_kind text,
  p_target_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_custom_label text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_rows int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND team_code = p_team_code AND team_code IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Invalid team link';
  END IF;

  -- Joining the team implies attending.
  INSERT INTO public.event_attendees (event_id, user_id, status)
  VALUES (p_event_id, v_caller, 'registered')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'registered';

  IF p_kind = 'cohost' THEN
    IF EXISTS (SELECT 1 FROM public.event_cohosts WHERE event_id = p_event_id AND user_id = v_caller) THEN
      RETURN 'already_cohost';
    END IF;
    INSERT INTO public.event_cohost_requests (event_id, user_id, role, custom_role_label)
    VALUES (p_event_id, v_caller, p_role, p_custom_label)
    ON CONFLICT (event_id, user_id)
      DO UPDATE SET role = EXCLUDED.role, custom_role_label = EXCLUDED.custom_role_label;
    RETURN 'cohost_pending';

  ELSIF p_kind = 'help' THEN
    UPDATE public.event_help_requests
      SET assigned_user_id = v_caller, status = 'filled'
      WHERE id = p_target_id AND event_id = p_event_id
        AND status = 'open' AND COALESCE(open_to_volunteers, true) = true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RAISE EXCEPTION 'That role is no longer available'; END IF;
    RETURN 'help_claimed';

  ELSIF p_kind = 'food' THEN
    UPDATE public.food_items
      SET assigned_to = v_caller
      WHERE id = p_target_id AND event_id = p_event_id
        AND completed = false AND assigned_to IS NULL
        AND COALESCE(open_to_volunteers, true) = true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RAISE EXCEPTION 'That item is no longer available'; END IF;
    RETURN 'food_claimed';

  ELSE
    RAISE EXCEPTION 'Unknown role kind: %', p_kind;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_team_role(uuid, text, text, uuid, text, text) TO authenticated;

-- 4. approve_cohost_request -------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_cohost_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  r public.event_cohost_requests%ROWTYPE;
  v_cohost_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO r FROM public.event_cohost_requests WHERE id = p_request_id;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = r.event_id AND e.host_id = v_caller)
     AND NOT public.is_event_cohost_editor(r.event_id, v_caller) THEN
    RAISE EXCEPTION 'Only the host can approve co-hosts';
  END IF;

  INSERT INTO public.event_cohosts (event_id, user_id, added_by, can_edit, role, custom_role_label)
  VALUES (r.event_id, r.user_id, v_caller, false, r.role, r.custom_role_label)
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING id INTO v_cohost_id;

  DELETE FROM public.event_cohost_requests WHERE id = p_request_id;
  RETURN v_cohost_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_cohost_request(uuid) TO authenticated;

-- 5. get_team_board (read gated by team_code) -------------------------------
CREATE OR REPLACE FUNCTION public.get_team_board(p_event_id uuid, p_team_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND team_code = p_team_code AND team_code IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Invalid team link';
  END IF;

  SELECT json_build_object(
    'event', (
      SELECT json_build_object('id', e.id, 'title', e.title, 'date', e.date, 'time', e.time, 'host_id', e.host_id)
      FROM public.events e WHERE e.id = p_event_id
    ),
    'taken_cohost_roles', (
      SELECT COALESCE(json_agg(c.role), '[]'::json)
      FROM public.event_cohosts c WHERE c.event_id = p_event_id AND c.role IS NOT NULL
    ),
    'help', (
      SELECT COALESCE(json_agg(json_build_object('id', h.id, 'title', h.title, 'description', h.description)), '[]'::json)
      FROM public.event_help_requests h
      WHERE h.event_id = p_event_id AND h.status = 'open' AND COALESCE(h.open_to_volunteers, true) = true
    ),
    'food', (
      SELECT COALESCE(json_agg(json_build_object('id', f.id, 'item', f.item, 'category', f.category)), '[]'::json)
      FROM public.food_items f
      WHERE f.event_id = p_event_id AND f.assigned_to IS NULL AND f.completed = false
        AND COALESCE(f.open_to_volunteers, true) = true
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_board(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
