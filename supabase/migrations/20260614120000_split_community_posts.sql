/*
  # Split community posts into their own table

  Up to now, community posts have been stored in the same `topics` table
  as preselected discussion topics, distinguished by a `topic_type` flag.
  As the schemas diverge (community posts get image uploads, polls, etc.)
  it makes sense to give them their own table.

  Strategy:
  1. Create `community_posts` with its own column set
  2. Extend the dependent tables (`comments`, `bookmarks`, `reports`,
     `likes`) with optional refs to community_posts. The legacy `topic_id`
     columns stay nullable for backward compat with preselected topics.
  3. Backfill: copy every `topics` row where `topic_type='community'`
     into `community_posts`, then remap any comments/bookmarks/likes/
     reports that pointed at those rows to point at the new community_post
     rows instead.
  4. Delete the migrated `topics` rows.
  5. RLS + content filter + comment notification triggers for the new table.
*/

-- ----------------------------------------------------------------------------
-- 1. community_posts table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  tags text[] DEFAULT ARRAY[]::text[],
  image_url text,
  bible_verse text,
  community_category text,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'friends_only')),
  is_pinned boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_visibility ON public.community_posts(visibility);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Extend dependent tables with optional community_post_id refs
-- ----------------------------------------------------------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS community_post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE;
ALTER TABLE public.comments
  ALTER COLUMN topic_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_community_post ON public.comments(community_post_id)
  WHERE community_post_id IS NOT NULL;

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS community_post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE;
ALTER TABLE public.bookmarks
  ALTER COLUMN topic_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookmarks_community_post ON public.bookmarks(community_post_id)
  WHERE community_post_id IS NOT NULL;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reported_community_post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_reports_community_post ON public.reports(reported_community_post_id)
  WHERE reported_community_post_id IS NOT NULL;

-- likes is already polymorphic via likeable_type — just allow the new type
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_likeable_type_check;
ALTER TABLE public.likes ADD CONSTRAINT likes_likeable_type_check
  CHECK (likeable_type IN ('topic', 'comment', 'community_post'));

-- reports also needs 'community_post' added to its report_type CHECK if not present
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_report_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_report_type_check
  CHECK (report_type IN ('user','location','event','topic','comment','message',
                         'announcement','help_request','community_post'));

-- ----------------------------------------------------------------------------
-- 3. RLS for community_posts
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Community posts: public or friends" ON public.community_posts;
CREATE POLICY "Community posts: public or friends"
  ON public.community_posts FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR author_id = auth.uid()
    OR (visibility = 'friends_only' AND public.users_are_connected(author_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Anyone authenticated can post" ON public.community_posts;
CREATE POLICY "Anyone authenticated can post"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can edit their posts" ON public.community_posts;
CREATE POLICY "Authors can edit their posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors or staff can delete" ON public.community_posts;
CREATE POLICY "Authors or staff can delete"
  ON public.community_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Content filter trigger on community_posts (same forbidden_words list)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_forbidden_content_community_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_matched text;
BEGIN
  v_matched := COALESCE(
    public.contains_forbidden_content(NEW.title),
    public.contains_forbidden_content(NEW.content)
  );
  IF v_matched IS NOT NULL THEN
    RAISE EXCEPTION 'Your post contains prohibited language. Please review our Community Guidelines at /terms.html and try again.'
      USING ERRCODE = 'check_violation', HINT = 'CONTENT_BLOCKED';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS community_posts_content_filter ON public.community_posts;
CREATE TRIGGER community_posts_content_filter
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content_community_post();

-- ----------------------------------------------------------------------------
-- 5. Comment-on-community-post notification — extend the existing trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_topic_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post_author uuid; v_commenter_name text; v_payload jsonb;
BEGIN
  IF NEW.topic_id IS NOT NULL THEN
    SELECT author_id INTO v_post_author FROM public.topics WHERE id = NEW.topic_id;
    v_payload := jsonb_build_object('topic_id', NEW.topic_id, 'comment_id', NEW.id, 'user_id', NEW.author_id);
  ELSIF NEW.community_post_id IS NOT NULL THEN
    SELECT author_id INTO v_post_author FROM public.community_posts WHERE id = NEW.community_post_id;
    v_payload := jsonb_build_object('community_post_id', NEW.community_post_id, 'comment_id', NEW.id, 'user_id', NEW.author_id);
  ELSE
    RETURN NEW;
  END IF;
  IF v_post_author IS NULL OR v_post_author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT name INTO v_commenter_name FROM public.users WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (v_post_author, 'comment',
    COALESCE(v_commenter_name,'Someone') || ' commented on your post',
    LEFT(COALESCE(NEW.content,''), 140),
    v_payload);
  RETURN NEW;
END; $$;
-- (trigger already exists on comments; the function is now polymorphic)

-- ----------------------------------------------------------------------------
-- 6. Backfill: copy community-typed topics → community_posts, remap refs
-- ----------------------------------------------------------------------------
-- Map old_topic_id → new_community_post_id so we can remap the dependent rows
CREATE TEMP TABLE _community_migration_map (
  old_topic_id uuid PRIMARY KEY,
  new_community_post_id uuid NOT NULL
);

WITH inserted AS (
  INSERT INTO public.community_posts (
    id, author_id, title, content, tags, image_url, bible_verse,
    community_category, visibility, is_pinned, view_count, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    t.author_id,
    COALESCE(t.title, 'Untitled'),
    t.content,
    COALESCE(t.tags, ARRAY[]::text[]),
    t.image_url,
    t.bible_verse,
    t.community_category,
    CASE WHEN t.visibility = 'friends_only' THEN 'friends_only' ELSE 'public' END,
    COALESCE(t.is_pinned, false),
    COALESCE(t.view_count, 0),
    t.created_at,
    t.updated_at
  FROM public.topics t
  WHERE t.topic_type = 'community'
  RETURNING id, author_id, title, created_at
)
INSERT INTO _community_migration_map (old_topic_id, new_community_post_id)
SELECT
  (SELECT t.id FROM public.topics t
    WHERE t.topic_type = 'community'
      AND t.author_id = i.author_id
      AND t.title = i.title
      AND t.created_at = i.created_at
    LIMIT 1),
  i.id
FROM inserted i
WHERE EXISTS (
  SELECT 1 FROM public.topics t
   WHERE t.topic_type = 'community'
     AND t.author_id = i.author_id
     AND t.title = i.title
     AND t.created_at = i.created_at
);

-- Remap dependent rows
UPDATE public.comments c
SET community_post_id = m.new_community_post_id, topic_id = NULL
FROM _community_migration_map m
WHERE c.topic_id = m.old_topic_id;

UPDATE public.bookmarks b
SET community_post_id = m.new_community_post_id, topic_id = NULL
FROM _community_migration_map m
WHERE b.topic_id = m.old_topic_id;

UPDATE public.likes l
SET likeable_type = 'community_post', likeable_id = m.new_community_post_id
FROM _community_migration_map m
WHERE l.likeable_type = 'topic' AND l.likeable_id = m.old_topic_id;

UPDATE public.reports r
SET reported_community_post_id = m.new_community_post_id,
    reported_topic_id = NULL,
    report_type = 'community_post'
FROM _community_migration_map m
WHERE r.reported_topic_id = m.old_topic_id;

-- 7. Delete the migrated topics rows
DELETE FROM public.topics
WHERE id IN (SELECT old_topic_id FROM _community_migration_map);

DROP TABLE _community_migration_map;

NOTIFY pgrst, 'reload schema';
