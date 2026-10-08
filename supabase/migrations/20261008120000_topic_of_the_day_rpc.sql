/*
  # Canonical "Topic of the Day"

  One source of truth so the home page, the in-app feed, and every viewer see
  the SAME topic. Resolves, in order:
    1. An admin-scheduled pick in daily_topics for today (UTC).
    2. Otherwise a deterministic daily rotation over public, approved topics:
       index = (days since 2020-01-01) mod count, over a stable created_at/id
       ordering — identical for anon and every signed-in user.

  Keyed to UTC (current_date on the UTC-default Supabase instance), matching the
  "changes daily at midnight UTC" copy. anon + authenticated callable.
  Idempotent.
*/

CREATE OR REPLACE FUNCTION public.get_topic_of_the_day()
RETURNS public.topics
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_topic public.topics;
  v_count int;
  v_idx int;
BEGIN
  -- 1) Admin override for today.
  SELECT t.* INTO v_topic
  FROM public.daily_topics d
  JOIN public.topics t ON t.id = d.topic_id
  WHERE d.date = current_date
    AND t.moderation_status = 'approved'
  LIMIT 1;
  IF FOUND THEN RETURN v_topic; END IF;

  -- 2) Deterministic daily rotation over public, approved topics.
  SELECT count(*) INTO v_count
  FROM public.topics
  WHERE moderation_status = 'approved' AND visibility = 'public';
  IF v_count = 0 THEN RETURN NULL; END IF;

  v_idx := (current_date - DATE '2020-01-01') % v_count;

  SELECT t.* INTO v_topic
  FROM public.topics t
  WHERE t.moderation_status = 'approved' AND t.visibility = 'public'
  ORDER BY t.created_at ASC, t.id ASC
  OFFSET v_idx LIMIT 1;

  RETURN v_topic;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_topic_of_the_day() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
