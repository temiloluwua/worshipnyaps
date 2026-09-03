/*
  # General-purpose polls for events and groups

  A poll has a question + text options; members vote (single or multi-select),
  results are visible live, and the creator/host/leader can close it. Distinct
  from the group *scheduling* polls (event_polls) which propose dates.

  Scope: each poll belongs to exactly one event OR one group.

  Security
    - Reads gated by event access / group membership (SECURITY DEFINER helpers,
      never inlined → no RLS recursion).
    - All writes go through SECURITY DEFINER RPCs that check permission, so the
      tables have SELECT policies only (no direct client insert/update/delete).
*/

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  question text NOT NULL,
  allow_multiple boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- exactly one scope
  CONSTRAINT polls_one_scope CHECK ((event_id IS NOT NULL) <> (group_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_polls_event ON public.polls(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_group ON public.polls(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.poll_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_poll_choices_poll ON public.poll_choices(poll_id);

CREATE TABLE IF NOT EXISTS public.poll_choice_votes (
  choice_id uuid NOT NULL REFERENCES public.poll_choices(id) ON DELETE CASCADE,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (choice_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_choice_votes(poll_id);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER — bypass RLS, no recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_event(p_event uuid, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e WHERE e.id = p_event AND (
      e.host_id = p_user
      OR e.visibility = 'public'
      OR (e.visibility IS NULL AND COALESCE(e.is_private, false) = false)
      OR EXISTS (SELECT 1 FROM event_cohosts c WHERE c.event_id = p_event AND c.user_id = p_user)
      OR EXISTS (SELECT 1 FROM event_attendees a WHERE a.event_id = p_event AND a.user_id = p_user AND a.status IN ('registered','attended'))
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_access_event(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_event(p_event uuid, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events e WHERE e.id = p_event AND e.host_id = p_user)
      OR EXISTS (SELECT 1 FROM event_cohosts c WHERE c.event_id = p_event AND c.user_id = p_user);
$$;
GRANT EXECUTE ON FUNCTION public.can_manage_event(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: SELECT only (writes via RPCs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_choice_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read polls you can access" ON public.polls;
CREATE POLICY "Read polls you can access"
  ON public.polls FOR SELECT TO authenticated
  USING (
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    OR (event_id IS NOT NULL AND public.can_access_event(event_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Read choices of visible polls" ON public.poll_choices;
CREATE POLICY "Read choices of visible polls"
  ON public.poll_choices FOR SELECT TO authenticated
  USING (poll_id IN (SELECT id FROM public.polls));

DROP POLICY IF EXISTS "Read votes of visible polls" ON public.poll_choice_votes;
CREATE POLICY "Read votes of visible polls"
  ON public.poll_choice_votes FOR SELECT TO authenticated
  USING (poll_id IN (SELECT id FROM public.polls));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_poll(
  p_event_id uuid,
  p_group_id uuid,
  p_question text,
  p_allow_multiple boolean,
  p_choices text[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll_id uuid;
  v_choice text;
  v_i int := 0;
  v_clean text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (p_event_id IS NOT NULL) = (p_group_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Poll must belong to exactly one event or group';
  END IF;
  IF COALESCE(btrim(p_question), '') = '' THEN RAISE EXCEPTION 'Question is required'; END IF;

  -- de-dupe + trim choices, need >= 2
  SELECT array_agg(c) INTO v_clean FROM (
    SELECT DISTINCT btrim(x) AS c FROM unnest(p_choices) x WHERE btrim(x) <> ''
  ) s;
  IF v_clean IS NULL OR array_length(v_clean, 1) < 2 THEN
    RAISE EXCEPTION 'Add at least two options';
  END IF;

  -- permission: event host/cohost, or group member
  IF p_event_id IS NOT NULL THEN
    IF NOT public.can_manage_event(p_event_id, v_uid) THEN
      RAISE EXCEPTION 'Only the host or a co-host can create event polls';
    END IF;
  ELSE
    IF NOT public.is_group_member(p_group_id, v_uid) THEN
      RAISE EXCEPTION 'Only group members can create polls';
    END IF;
  END IF;

  INSERT INTO polls (event_id, group_id, question, allow_multiple, created_by)
  VALUES (p_event_id, p_group_id, btrim(p_question), COALESCE(p_allow_multiple, false), v_uid)
  RETURNING id INTO v_poll_id;

  FOREACH v_choice IN ARRAY v_clean LOOP
    INSERT INTO poll_choices (poll_id, text, sort_order) VALUES (v_poll_id, v_choice, v_i);
    v_i := v_i + 1;
  END LOOP;

  RETURN v_poll_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_poll(uuid, uuid, text, boolean, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_poll_choice_vote(p_choice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll polls%ROWTYPE;
  v_already boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT p.* INTO v_poll FROM polls p
  JOIN poll_choices c ON c.poll_id = p.id
  WHERE c.id = p_choice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll option not found'; END IF;
  IF v_poll.status <> 'open' THEN RAISE EXCEPTION 'This poll is closed'; END IF;

  -- must be able to access the poll's scope
  IF v_poll.event_id IS NOT NULL THEN
    IF NOT public.can_access_event(v_poll.event_id, v_uid) THEN RAISE EXCEPTION 'You cannot vote on this poll'; END IF;
  ELSE
    IF NOT public.is_group_member(v_poll.group_id, v_uid) THEN RAISE EXCEPTION 'You cannot vote on this poll'; END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM poll_choice_votes WHERE choice_id = p_choice_id AND user_id = v_uid) INTO v_already;

  IF v_already THEN
    DELETE FROM poll_choice_votes WHERE choice_id = p_choice_id AND user_id = v_uid;
  ELSE
    -- single-select: clear the user's other votes on this poll first
    IF NOT v_poll.allow_multiple THEN
      DELETE FROM poll_choice_votes WHERE poll_id = v_poll.id AND user_id = v_uid;
    END IF;
    INSERT INTO poll_choice_votes (choice_id, poll_id, user_id) VALUES (p_choice_id, v_poll.id, v_uid)
    ON CONFLICT (choice_id, user_id) DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_poll_choice_vote(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_poll(p_poll_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll polls%ROWTYPE;
  v_can boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll not found'; END IF;

  v_can := (v_poll.created_by = v_uid);
  IF NOT v_can AND v_poll.event_id IS NOT NULL THEN v_can := public.can_manage_event(v_poll.event_id, v_uid); END IF;
  IF NOT v_can AND v_poll.group_id IS NOT NULL THEN v_can := public.is_group_leader(v_poll.group_id, v_uid); END IF;
  IF NOT v_can THEN RAISE EXCEPTION 'You cannot close this poll'; END IF;

  UPDATE polls SET status = 'closed' WHERE id = p_poll_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_poll(uuid) TO authenticated;
