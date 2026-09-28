/*
  # Admin-scheduled Topic of the Day

  Lets admins hand-pick the topic of the day for specific dates (today and
  upcoming) instead of the purely algorithmic date-hash pick. Any date without
  a row falls back to the existing hash, so unscheduled days still auto-fill.

  - daily_topics: one row per calendar date → the chosen topic.
  - Public read (the landing page is anon and shows the same pick).
  - Admin-only writes, enforced via the existing public.is_admin(uuid) helper.
  Idempotent.
*/

CREATE TABLE IF NOT EXISTS public.daily_topics (
  date date PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  set_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_topics ENABLE ROW LEVEL SECURITY;

-- Anyone can read the schedule (landing page is unauthenticated).
DROP POLICY IF EXISTS "Anyone can read daily topics" ON public.daily_topics;
CREATE POLICY "Anyone can read daily topics" ON public.daily_topics
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can schedule / change / clear.
DROP POLICY IF EXISTS "Admins manage daily topics" ON public.daily_topics;
CREATE POLICY "Admins manage daily topics" ON public.daily_topics
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';
