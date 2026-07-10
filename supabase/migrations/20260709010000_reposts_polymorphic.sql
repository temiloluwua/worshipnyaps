/*
  # Make reposts work for community posts too

  ## Why
  reposts.original_topic_id had a hard FK to public.topics(id). Community
  posts live in public.community_posts, so reposting/quoting a community post
  violated the FK and failed. Reposts also weren't rendered anywhere.

  ## What
  - Drop the topics-only FK so the id can reference either table.
  - Add source_type ('topic' | 'community_post') so the client knows which
    table to resolve the original from. Defaults to 'topic' for existing rows.
*/

ALTER TABLE public.reposts
  DROP CONSTRAINT IF EXISTS reposts_original_topic_id_fkey;

ALTER TABLE public.reposts
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'topic'
  CHECK (source_type IN ('topic', 'community_post'));

CREATE INDEX IF NOT EXISTS idx_reposts_created ON public.reposts(created_at DESC);

NOTIFY pgrst, 'reload schema';
