/*
  # Community-post scheduling polls + share-an-event

  Extends the existing group scheduling-poll machinery (event_polls / poll_options /
  poll_votes, from 20260731000000_scheduling_polls.sql) so a poll can also be scoped to
  a community_posts row. On the community feed a host posts a "which day works?" poll;
  people vote for the day(s) they can make; the host finalizes a winning option, which
  creates an event AND registers the host + everyone who voted for that day as attendees.

  Also adds community_posts.event_id / needs_help so a post can share one of the host's
  events and flag that it needs volunteers.

  Idempotent — safe to re-run.
*/

-- ---------------------------------------------------------------------------
-- A. community_posts: optional shared event + needs-help flag
-- ---------------------------------------------------------------------------
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS needs_help boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Access helper: mirrors the community_posts SELECT policy (public / self /
-- friends_only+connected). SECURITY DEFINER so the vote RPC — which bypasses RLS
-- — can still enforce post visibility.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_community_post(p_post uuid, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_posts cp WHERE cp.id = p_post AND (
      cp.visibility = 'public'
      OR cp.author_id = p_user
      OR (cp.visibility = 'friends_only' AND public.users_are_connected(cp.author_id, p_user))
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_access_community_post(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- B. event_polls: add a community-post scope alongside the existing group scope
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_polls ALTER COLUMN group_id DROP NOT NULL;
ALTER TABLE public.event_polls
  ADD COLUMN IF NOT EXISTS community_post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE;

-- exactly one scope (group OR community post)
ALTER TABLE public.event_polls DROP CONSTRAINT IF EXISTS event_polls_one_scope;
ALTER TABLE public.event_polls ADD CONSTRAINT event_polls_one_scope
  CHECK ((group_id IS NOT NULL) <> (community_post_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_event_polls_community_post
  ON public.event_polls(community_post_id, created_at DESC)
  WHERE community_post_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS: keep the group branch, add a community branch. The community-post
-- subquery is itself RLS-gated, so a poll is only visible when its post is.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "polls_select" ON public.event_polls;
CREATE POLICY "polls_select" ON public.event_polls FOR SELECT TO authenticated
  USING (
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    OR (community_post_id IS NOT NULL AND community_post_id IN (SELECT id FROM public.community_posts))
  );

DROP POLICY IF EXISTS "poll_options_select" ON public.poll_options;
CREATE POLICY "poll_options_select" ON public.poll_options FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_polls p
    WHERE p.id = poll_id AND (
      (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, auth.uid()))
      OR (p.community_post_id IS NOT NULL AND p.community_post_id IN (SELECT id FROM public.community_posts))
    )
  ));

DROP POLICY IF EXISTS "poll_votes_select" ON public.poll_votes;
CREATE POLICY "poll_votes_select" ON public.poll_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.poll_options o JOIN public.event_polls p ON p.id = o.poll_id
    WHERE o.id = poll_votes.option_id AND (
      (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, auth.uid()))
      OR (p.community_post_id IS NOT NULL AND p.community_post_id IN (SELECT id FROM public.community_posts))
    )
  ));

-- ---------------------------------------------------------------------------
-- C. RPCs
-- ---------------------------------------------------------------------------

-- create_community_schedule_poll(post, question, [{date,time}, ...]) — author only.
CREATE OR REPLACE FUNCTION public.create_community_schedule_poll(
  p_community_post_id uuid, p_question text, p_options jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_poll uuid; v_opt jsonb; v_i int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_community_post_id AND author_id = v_uid) THEN
    RAISE EXCEPTION 'Only the author can add a poll to this post';
  END IF;
  IF COALESCE(btrim(p_question), '') = '' THEN RAISE EXCEPTION 'Question is required'; END IF;
  IF jsonb_typeof(p_options) <> 'array' OR jsonb_array_length(p_options) < 2 THEN
    RAISE EXCEPTION 'Add at least two day options';
  END IF;

  INSERT INTO public.event_polls (community_post_id, question, created_by)
  VALUES (p_community_post_id, btrim(p_question), v_uid) RETURNING id INTO v_poll;

  FOR v_opt IN SELECT * FROM jsonb_array_elements(p_options) LOOP
    INSERT INTO public.poll_options (poll_id, proposed_date, proposed_time, sort_order)
    VALUES (v_poll, (v_opt->>'date')::date, (v_opt->>'time')::time, v_i);
    v_i := v_i + 1;
  END LOOP;

  RETURN v_poll;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_community_schedule_poll(uuid, text, jsonb) TO authenticated;

-- Toggle the caller's availability for an option (group OR community scope).
CREATE OR REPLACE FUNCTION public.toggle_poll_vote(p_option_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_group uuid; v_post uuid; v_open boolean; v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.group_id, p.community_post_id, (p.status = 'open') INTO v_group, v_post, v_open
  FROM public.poll_options o JOIN public.event_polls p ON p.id = o.poll_id WHERE o.id = p_option_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll option not found'; END IF;
  IF NOT v_open THEN RAISE EXCEPTION 'This poll is closed'; END IF;

  IF v_group IS NOT NULL THEN
    IF NOT public.is_group_member(v_group, v_uid) THEN RAISE EXCEPTION 'Not a member of this group'; END IF;
  ELSE
    IF NOT public.can_access_community_post(v_post, v_uid) THEN RAISE EXCEPTION 'You cannot vote on this poll'; END IF;
  END IF;

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

-- Finalize a winning option → create the event, register host + everyone who voted
-- for that day, close the poll, and (community scope) link the post to the new event.
CREATE OR REPLACE FUNCTION public.close_poll_to_event(p_option_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll uuid; v_group uuid; v_post uuid; v_created_by uuid;
  v_q text; v_date date; v_time time; v_event uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.id, p.group_id, p.community_post_id, p.created_by, p.question, o.proposed_date, o.proposed_time
  INTO v_poll, v_group, v_post, v_created_by, v_q, v_date, v_time
  FROM public.poll_options o JOIN public.event_polls p ON p.id = o.poll_id WHERE o.id = p_option_id;
  IF v_poll IS NULL THEN RAISE EXCEPTION 'Poll option not found'; END IF;

  -- permission: group leader (group polls) or the post author (community polls)
  IF v_group IS NOT NULL THEN
    IF NOT public.is_group_leader(v_group, v_uid) THEN RAISE EXCEPTION 'Only leaders can finalize a poll'; END IF;
  ELSE
    IF v_created_by <> v_uid THEN RAISE EXCEPTION 'Only the author can finalize this poll'; END IF;
  END IF;

  IF v_group IS NOT NULL THEN
    INSERT INTO public.events (title, type, description, date, time, host_id, group_id, visibility, status)
    VALUES (left(v_q, 80), 'bible-study', v_q, v_date, v_time, v_created_by, v_group, 'friends_only', 'upcoming')
    RETURNING id INTO v_event;
  ELSE
    INSERT INTO public.events (title, type, description, date, time, host_id, group_id, visibility, status)
    VALUES (left(v_q, 80), 'bible-study', v_q, v_date, v_time, v_created_by, NULL, 'public', 'upcoming')
    RETURNING id INTO v_event;
    UPDATE public.community_posts SET event_id = v_event WHERE id = v_post;
  END IF;

  -- Register the host + everyone who voted for the winning day.
  INSERT INTO public.event_attendees (event_id, user_id, status)
  SELECT v_event, u, 'registered' FROM (
    SELECT v_created_by AS u
    UNION
    SELECT user_id FROM public.poll_votes WHERE option_id = p_option_id
  ) s
  ON CONFLICT DO NOTHING;

  UPDATE public.event_polls SET status = 'closed', created_event_id = v_event WHERE id = v_poll;
  RETURN v_event;
END; $$;
GRANT EXECUTE ON FUNCTION public.close_poll_to_event(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
