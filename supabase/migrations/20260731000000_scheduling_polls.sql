/*
  # Scheduling polls (Milestone 2)

  A group leader proposes a few date/time options; members tap the ones they
  can make (multi-select). The leader then picks the winning option, which
  creates the group event at that time and closes the poll.

  Group-scoped, invite-safe: all reads gated by group membership; writes go
  through SECURITY DEFINER RPCs. Uses the plpgsql is_group_member/is_group_leader
  helpers (never inlined → no RLS recursion).
*/

CREATE TABLE IF NOT EXISTS public.event_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  question text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_polls_group ON public.event_polls(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.event_polls(id) ON DELETE CASCADE,
  proposed_date date NOT NULL,
  proposed_time time NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON public.poll_options(poll_id);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, user_id)
);

ALTER TABLE public.event_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Reads gated by group membership (writes go through the RPCs below).
DROP POLICY IF EXISTS "polls_select" ON public.event_polls;
CREATE POLICY "polls_select" ON public.event_polls FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "poll_options_select" ON public.poll_options;
CREATE POLICY "poll_options_select" ON public.poll_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_polls p WHERE p.id = poll_id AND public.is_group_member(p.group_id, auth.uid())));

DROP POLICY IF EXISTS "poll_votes_select" ON public.poll_votes;
CREATE POLICY "poll_votes_select" ON public.poll_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.poll_options o JOIN public.event_polls p ON p.id = o.poll_id
    WHERE o.id = poll_votes.option_id AND public.is_group_member(p.group_id, auth.uid())
  ));

-- create_schedule_poll(group, question, [{date,time}, ...]) — leader only.
CREATE OR REPLACE FUNCTION public.create_schedule_poll(p_group_id uuid, p_question text, p_options jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_poll uuid; v_opt jsonb; v_i int := 0; v_gname text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_group_leader(p_group_id, v_uid) THEN RAISE EXCEPTION 'Only leaders can create polls'; END IF;
  IF jsonb_typeof(p_options) <> 'array' OR jsonb_array_length(p_options) < 2 THEN
    RAISE EXCEPTION 'Add at least two time options';
  END IF;

  INSERT INTO public.event_polls (group_id, question, created_by) VALUES (p_group_id, p_question, v_uid) RETURNING id INTO v_poll;
  FOR v_opt IN SELECT * FROM jsonb_array_elements(p_options) LOOP
    INSERT INTO public.poll_options (poll_id, proposed_date, proposed_time, sort_order)
    VALUES (v_poll, (v_opt->>'date')::date, (v_opt->>'time')::time, v_i);
    v_i := v_i + 1;
  END LOOP;

  SELECT name INTO v_gname FROM public.groups WHERE id = p_group_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT gm.user_id, 'general', 'New scheduling poll in ' || COALESCE(v_gname, 'your group'),
         left(p_question, 120), jsonb_build_object('group_id', p_group_id)
  FROM public.group_members gm WHERE gm.group_id = p_group_id AND gm.user_id <> v_uid;

  RETURN v_poll;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_schedule_poll(uuid, text, jsonb) TO authenticated;

-- Toggle the caller's availability for an option.
CREATE OR REPLACE FUNCTION public.toggle_poll_vote(p_option_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_group uuid; v_open boolean; v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.group_id, (p.status = 'open') INTO v_group, v_open
  FROM public.poll_options o JOIN public.event_polls p ON p.id = o.poll_id WHERE o.id = p_option_id;
  IF v_group IS NULL THEN RAISE EXCEPTION 'Poll option not found'; END IF;
  IF NOT public.is_group_member(v_group, v_uid) THEN RAISE EXCEPTION 'Not a member of this group'; END IF;
  IF NOT v_open THEN RAISE EXCEPTION 'This poll is closed'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.poll_votes WHERE option_id = p_option_id AND user_id = v_uid) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.poll_votes WHERE option_id = p_option_id AND user_id = v_uid;
    RETURN false;
  ELSE
    INSERT INTO public.poll_votes (option_id, user_id) VALUES (p_option_id, v_uid) ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.toggle_poll_vote(uuid) TO authenticated;

-- Leader picks a winning option → creates the group event, closes the poll.
CREATE OR REPLACE FUNCTION public.close_poll_to_event(p_option_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_poll uuid; v_group uuid; v_q text; v_date date; v_time time; v_event uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.id, p.group_id, p.question, o.proposed_date, o.proposed_time
  INTO v_poll, v_group, v_q, v_date, v_time
  FROM public.poll_options o JOIN public.event_polls p ON p.id = o.poll_id WHERE o.id = p_option_id;
  IF v_poll IS NULL THEN RAISE EXCEPTION 'Poll option not found'; END IF;
  IF NOT public.is_group_leader(v_group, v_uid) THEN RAISE EXCEPTION 'Only leaders can finalize a poll'; END IF;

  INSERT INTO public.events (title, type, description, date, time, host_id, group_id, visibility, status)
  VALUES (left(v_q, 80), 'bible-study', v_q, v_date, v_time, v_uid, v_group, 'friends_only', 'upcoming')
  RETURNING id INTO v_event;

  UPDATE public.event_polls SET status = 'closed', created_event_id = v_event WHERE id = v_poll;
  RETURN v_event;
END; $$;
GRANT EXECUTE ON FUNCTION public.close_poll_to_event(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
