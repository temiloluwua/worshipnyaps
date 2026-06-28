/*
  # Full-text search on community_posts

  ## Why
  Current Search tab only found topics by title/content with ILIKE.
  Community posts (the user-generated feed) weren't searchable. ILIKE is
  also case/typo sensitive and doesn't rank — "prayer" vs "prayers"
  misses. Postgres FTS handles stemming, ranking, and is fast on the
  scale we'll see.

  ## What
  - search_vector tsvector column populated via BEFORE INSERT/UPDATE
    trigger. We use a trigger instead of a STORED GENERATED column
    because to_tsvector('english', ...) is treated as STABLE (not
    IMMUTABLE) by Postgres, which generated columns reject.
  - GIN index for sub-millisecond lookups.
  - Helper RPC search_community_posts(q text, lim int) wraps
    websearch_to_tsquery (natural-language search: quoted phrases, OR,
    NOT all work) and avoids exposing raw SQL to the client.
*/

ALTER TABLE public.community_posts DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.community_posts ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION public.community_posts_set_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_search_vector ON public.community_posts;
CREATE TRIGGER trg_community_posts_search_vector
  BEFORE INSERT OR UPDATE OF title, content, tags
  ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_posts_set_search_vector();

UPDATE public.community_posts
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C');

CREATE INDEX IF NOT EXISTS idx_community_posts_search_vector
  ON public.community_posts USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.search_community_posts(q text, lim int DEFAULT 20)
RETURNS SETOF public.community_posts
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT cp.*
  FROM public.community_posts cp
  WHERE q IS NOT NULL AND length(trim(q)) > 0
    AND cp.search_vector @@ websearch_to_tsquery('english', q)
  ORDER BY ts_rank(cp.search_vector, websearch_to_tsquery('english', q)) DESC,
           cp.created_at DESC
  LIMIT GREATEST(LEAST(lim, 100), 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_community_posts(text, int) TO authenticated;

NOTIFY pgrst, 'reload schema';
