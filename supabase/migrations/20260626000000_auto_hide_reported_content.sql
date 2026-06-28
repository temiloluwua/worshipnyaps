/*
  # Auto-hide reported content after 2+ distinct reports

  ## Why
  We need a fast response to abusive content without paying for full-time
  moderation. Two distinct users flagging the same post is a strong signal
  that something's off, and that's the threshold that kills single-troll
  attack vectors while still acting fast on community consensus.

  ## What
  - Add hidden_at timestamps to community_posts and topics.
  - AFTER INSERT trigger on reports increments the report count for the
    target and, if 2+ distinct reporters have flagged the same content,
    sets hidden_at = now().
  - RLS updated so hidden content is invisible to everyone except its
    author and staff (admins/moderators). Mods can then review and either
    "dismiss" (delete the reports → next report is fresh) or "remove"
    (delete the post outright).
*/

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_community_posts_hidden
  ON public.community_posts(hidden_at) WHERE hidden_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topics_hidden
  ON public.topics(hidden_at) WHERE hidden_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.auto_hide_after_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.reported_community_post_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT reporter_id) INTO v_count
    FROM public.reports
    WHERE reported_community_post_id = NEW.reported_community_post_id;
    IF v_count >= 2 THEN
      UPDATE public.community_posts
      SET hidden_at = COALESCE(hidden_at, now())
      WHERE id = NEW.reported_community_post_id;
    END IF;
  ELSIF NEW.reported_topic_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT reporter_id) INTO v_count
    FROM public.reports
    WHERE reported_topic_id = NEW.reported_topic_id;
    IF v_count >= 2 THEN
      UPDATE public.topics
      SET hidden_at = COALESCE(hidden_at, now())
      WHERE id = NEW.reported_topic_id;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the report itself if the hide-update fails.
  RAISE WARNING 'auto_hide_after_reports failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_hide_after_reports ON public.reports;
CREATE TRIGGER trg_auto_hide_after_reports
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_hide_after_reports();

-- community_posts SELECT: hide rows with hidden_at unless author or staff.
DROP POLICY IF EXISTS "Community posts: public or friends" ON public.community_posts;
CREATE POLICY "Community posts: public or friends"
  ON public.community_posts FOR SELECT TO authenticated
  USING (
    (hidden_at IS NULL
      OR author_id = (select auth.uid())
      OR public.is_staff((select auth.uid())))
    AND (
      visibility = 'public'
      OR author_id = (select auth.uid())
      OR (visibility = 'friends_only' AND public.users_are_connected(author_id, (select auth.uid())))
    )
  );

-- topics SELECT: hide rows with hidden_at unless author or staff. Topics
-- are anon-readable (landing page samples) — keep that but gate hidden.
DROP POLICY IF EXISTS "Anyone can read topics" ON public.topics;
CREATE POLICY "Anyone can read topics"
  ON public.topics FOR SELECT TO anon
  USING (hidden_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can read topics" ON public.topics;
CREATE POLICY "Authenticated users can read topics"
  ON public.topics FOR SELECT TO authenticated
  USING (
    hidden_at IS NULL
    OR author_id = (select auth.uid())
    OR public.is_staff((select auth.uid()))
  );

NOTIFY pgrst, 'reload schema';
