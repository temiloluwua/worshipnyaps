/*
  # Server-side content filter (App Store 1.2 #3)

  Apple requires a mechanism that prevents objectionable content from being
  posted. We use a database-level deny list applied via BEFORE INSERT/UPDATE
  triggers on every UGC table.

  Design:
  - `forbidden_words` table holds the deny list (seeded below, admin-extensible)
  - `contains_forbidden_content(text)` returns the first matching word (or NULL)
    using a case-insensitive word-boundary regex match — so "class" doesn't
    match "ass", "scrap" doesn't match "crap", etc.
  - One trigger function `block_forbidden_content()` checks each text column
    and raises a friendly EXCEPTION the client renders as a toast
  - Triggers attached to: topics, comments, direct_messages, events,
    event_announcements, event_help_requests, and users (bio/name updates)

  Important UX notes:
  - The block is server-side so curl, raw API, and third-party clients all
    hit the same wall. Pure client-side filtering would not satisfy Apple.
  - The exception text is user-readable and references the Community
    Guidelines so reviewers know we're not just throwing 500s.
  - Admins can add words via INSERT INTO forbidden_words (no code change).
*/

-- ----------------------------------------------------------------------------
-- 1. Deny list table + minimal starter seed (Apple-test-relevant categories)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forbidden_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('slur', 'sexual', 'self_harm', 'violence', 'other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forbidden_words_lower ON public.forbidden_words(LOWER(word));

ALTER TABLE public.forbidden_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Forbidden words are admin-only" ON public.forbidden_words;
CREATE POLICY "Forbidden words are admin-only"
  ON public.forbidden_words FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Minimal canonical seed — admin can extend privately via SQL editor.
-- Words use lowercase + simple form; the matcher uses word boundaries.
INSERT INTO public.forbidden_words (word, category) VALUES
  ('nigger', 'slur'),
  ('faggot', 'slur'),
  ('tranny', 'slur'),
  ('chink', 'slur'),
  ('spic', 'slur'),
  ('kike', 'slur'),
  ('cunt', 'sexual'),
  ('porn', 'sexual'),
  ('pornography', 'sexual'),
  ('rape', 'violence'),
  ('rapist', 'violence'),
  ('pedo', 'sexual'),
  ('pedophile', 'sexual'),
  ('killyourself', 'self_harm'),
  ('kysrself', 'self_harm')
ON CONFLICT (word) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Matcher function — returns first matching word or NULL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contains_forbidden_content(p_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_match text;
BEGIN
  IF p_input IS NULL OR LENGTH(TRIM(p_input)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT fw.word INTO v_match
  FROM public.forbidden_words fw
  WHERE p_input ~* ('\m' || regexp_replace(fw.word, '([.\\\\+*?\[^\]$(){}=!<>|:\-])', '\\\\\1', 'g') || '\M')
  LIMIT 1;

  RETURN v_match;
END;
$$;
GRANT EXECUTE ON FUNCTION public.contains_forbidden_content(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Generic trigger function — checks all relevant columns of NEW row
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_forbidden_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text := TG_TABLE_NAME;
  v_matched text;
BEGIN
  -- Per-table column inspection (use static IFs because trigger functions
  -- don't get NEW.<colname> as a variable lookup natively)
  IF v_table_name = 'topics' THEN
    v_matched := COALESCE(
      public.contains_forbidden_content(NEW.title),
      public.contains_forbidden_content(NEW.content)
    );
  ELSIF v_table_name = 'comments' THEN
    v_matched := public.contains_forbidden_content(NEW.content);
  ELSIF v_table_name = 'direct_messages' THEN
    v_matched := public.contains_forbidden_content(NEW.content);
  ELSIF v_table_name = 'events' THEN
    v_matched := COALESCE(
      public.contains_forbidden_content(NEW.title),
      public.contains_forbidden_content(NEW.description)
    );
  ELSIF v_table_name = 'event_announcements' THEN
    v_matched := public.contains_forbidden_content(NEW.content);
  ELSIF v_table_name = 'event_help_requests' THEN
    v_matched := COALESCE(
      public.contains_forbidden_content(NEW.title),
      public.contains_forbidden_content(NEW.description)
    );
  ELSIF v_table_name = 'users' THEN
    v_matched := COALESCE(
      public.contains_forbidden_content(NEW.name),
      public.contains_forbidden_content(NEW.bio)
    );
  END IF;

  IF v_matched IS NOT NULL THEN
    RAISE EXCEPTION 'Your post contains prohibited language. Please review our Community Guidelines at /terms.html and try again.'
      USING ERRCODE = 'check_violation', HINT = 'CONTENT_BLOCKED';
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Attach the trigger to every UGC table
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS topics_content_filter ON public.topics;
CREATE TRIGGER topics_content_filter
  BEFORE INSERT OR UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content();

DROP TRIGGER IF EXISTS comments_content_filter ON public.comments;
CREATE TRIGGER comments_content_filter
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content();

DROP TRIGGER IF EXISTS direct_messages_content_filter ON public.direct_messages;
CREATE TRIGGER direct_messages_content_filter
  BEFORE INSERT OR UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content();

DROP TRIGGER IF EXISTS events_content_filter ON public.events;
CREATE TRIGGER events_content_filter
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content();

DROP TRIGGER IF EXISTS announcements_content_filter ON public.event_announcements;
CREATE TRIGGER announcements_content_filter
  BEFORE INSERT OR UPDATE ON public.event_announcements
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content();

DROP TRIGGER IF EXISTS help_requests_content_filter ON public.event_help_requests;
CREATE TRIGGER help_requests_content_filter
  BEFORE INSERT OR UPDATE ON public.event_help_requests
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content();

DROP TRIGGER IF EXISTS users_content_filter ON public.users;
CREATE TRIGGER users_content_filter
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.block_forbidden_content();

NOTIFY pgrst, 'reload schema';
