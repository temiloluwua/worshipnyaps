/*
  # Short event links — /e/{short_code}

  Gives every event a compact, crypto-strong slug so shared invite links can be
  worshipnyaps.com/e/k7Qm2pQ instead of /event/{uuid}?invite={code}. The slug is
  the shareable credential: resolving it returns both the event id and the invite
  code, so private/friends events get short links too (same secrecy as the old
  ?invite= link — you need the slug, which is unguessable).

  - events.short_code: unique 7-char base32 slug (Crockford-style, no ambiguous
    chars), generated in Postgres from gen_random_bytes (pgcrypto).
  - BEFORE INSERT trigger fills it when null; existing rows backfilled below.
  - resolve_event_short_code(code): anon-callable SECURITY DEFINER lookup.
  Idempotent.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS short_code text;

-- Generate a 7-char slug from crypto-strong random bytes over an
-- ambiguity-free alphabet (no 0/O/1/I/L). ~34 bits of entropy.
CREATE OR REPLACE FUNCTION public.gen_event_short_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  b bytea := gen_random_bytes(7);
  i int;
BEGIN
  FOR i IN 0..6 LOOP
    -- 32-char alphabet → 5 usable bits per byte.
    code := code || substr(alphabet, (get_byte(b, i) & 31) + 1, 1);
  END LOOP;
  RETURN code;
END; $$;

-- Assign a unique slug on insert when one wasn't supplied. Retries on the
-- (astronomically unlikely) collision until the UNIQUE index is satisfied.
CREATE OR REPLACE FUNCTION public.events_set_short_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.short_code IS NULL OR btrim(NEW.short_code) = '' THEN
    LOOP
      NEW.short_code := public.gen_event_short_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.events WHERE short_code = NEW.short_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_events_set_short_code ON public.events;
CREATE TRIGGER trg_events_set_short_code
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_set_short_code();

-- Backfill existing rows one at a time so each gets a distinct slug.
DO $$
DECLARE r record; c text;
BEGIN
  FOR r IN SELECT id FROM public.events WHERE short_code IS NULL LOOP
    LOOP
      c := public.gen_event_short_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.events WHERE short_code = c);
    END LOOP;
    UPDATE public.events SET short_code = c WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_short_code
  ON public.events(short_code);

-- Anon-callable resolver: slug → event id + invite code. The slug is the
-- credential, so this intentionally hands back the invite code needed to open
-- private/friends events. Returns no rows for an unknown slug.
CREATE OR REPLACE FUNCTION public.resolve_event_short_code(p_code text)
RETURNS TABLE (event_id uuid, invite_code text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.invite_code
  FROM public.events e
  WHERE e.short_code = btrim(p_code)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_event_short_code(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
