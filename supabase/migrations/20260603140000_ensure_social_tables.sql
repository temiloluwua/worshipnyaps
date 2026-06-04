/*
  # Ensure social tables (bookmarks, reposts, activity_feed) exist

  The original migration that created these tables was never applied on the
  live Supabase project, so bookmark/repost actions silently fail.
  Idempotent: safe to re-run.
*/

-- =====================================================
-- bookmarks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create own bookmarks"
  ON public.bookmarks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- reposts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  quote_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all reposts" ON public.reposts;
CREATE POLICY "Users can view all reposts"
  ON public.reposts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create own reposts" ON public.reposts;
CREATE POLICY "Users can create own reposts"
  ON public.reposts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reposts" ON public.reposts;
CREATE POLICY "Users can delete own reposts"
  ON public.reposts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- activity_feed (createRepost also inserts here)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  target_id uuid,
  target_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all activity" ON public.activity_feed;
CREATE POLICY "Users can view all activity"
  ON public.activity_feed FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create own activity" ON public.activity_feed;
CREATE POLICY "Users can create own activity"
  ON public.activity_feed FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON public.activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.activity_feed(created_at DESC);

NOTIFY pgrst, 'reload schema';
