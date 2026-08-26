/*
  # Shared content-translation cache

  Stores one row per (language, source text) so a given phrase is translated by
  the external (free) provider at most once ever, then served to every user
  from the DB. This keeps on-the-fly card translation reliably free — cache hits
  never touch the provider, so rate limits are a non-issue at scale.

  Security
    - Public read: translations of public card content are not sensitive.
    - Authenticated insert only (upsert on conflict), so signed-in clients can
      populate the cache after a provider call. No update/delete for clients.
*/

CREATE TABLE IF NOT EXISTS public.content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lang text NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lang, source_text)
);

CREATE INDEX IF NOT EXISTS idx_content_translations_lookup
  ON public.content_translations (lang, source_text);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read content translations" ON public.content_translations;
CREATE POLICY "Anyone can read content translations"
  ON public.content_translations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can add content translations" ON public.content_translations;
CREATE POLICY "Authenticated can add content translations"
  ON public.content_translations FOR INSERT
  TO authenticated
  WITH CHECK (true);
