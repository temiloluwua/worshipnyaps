/*
  # Server-side profanity enforcement (hard gate)

  The client filter (src/lib/contentFilter.ts) nudges normal users, but it's
  bypassable (modified client / direct API calls). This rejects banned content
  at the database so it can never be stored, regardless of how the insert
  arrives. Covers every free-text UGC table:
    direct_messages, chat_messages, comments, topics, community_posts

  The word list + normalization intentionally mirror the client so behavior is
  consistent. Conservative whole-word matching avoids the "Scunthorpe problem".
  Idempotent.
*/

-- Mirrors normalize() + the word list in src/lib/contentFilter.ts:
-- leetspeak → letters, strip non-letters, collapse 3+ repeats to 2, then match
-- whole words (optional trailing "s").
CREATE OR REPLACE FUNCTION public.contains_blocked_words(p_text text)
RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           regexp_replace(
             translate(lower(coalesce(p_text, '')), '@431!|0$57', 'aaeiiiosst'),
             '[^a-z ]', '', 'g'),
           '(.)\1{2,}', '\1\1', 'g')
         ~ ('\m(' ||
            'fuck|shit|bitch|asshole|bastard|cunt|dick|piss|slut|whore|faggot|' ||
            'nigger|nigga|retard|spic|kike|chink|coon|wetback|tranny' ||
            ')s?\M');
$$;

-- Generic BEFORE trigger: reads title/content via to_jsonb so one function
-- serves tables with different column sets (missing keys resolve to NULL).
CREATE OR REPLACE FUNCTION public.reject_blocked_words()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
  combined text := coalesce(j->>'title', '') || ' ' || coalesce(j->>'content', '');
BEGIN
  IF public.contains_blocked_words(combined) THEN
    RAISE EXCEPTION 'Content blocked: please remove inappropriate language'
      USING errcode = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['direct_messages','chat_messages','comments','topics','community_posts']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_reject_blocked_words ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_reject_blocked_words
         BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_words()', tbl);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
