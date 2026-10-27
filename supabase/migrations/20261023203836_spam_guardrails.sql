/*
  # Server-side anti-spam / anti-bot guardrails

  Enforces limits in Postgres via BEFORE INSERT triggers, so they apply no
  matter how the row is created (app, script, or bot hitting the API directly).
  The client-side filters (contentFilter.ts, Turnstile) stay as first-line UX;
  this is the hard gate behind them.

  One reusable function, enforce_spam_guardrails(), is attached to each content
  table with per-table args: (actor_column, max_per_minute, text_columns...).

  Three checks per insert (admins/hosts bypass all):
    1. Rate limit  — too many inserts by this actor in the trailing 60s.
    2. Link gate   — unverified OR brand-new (<24h) accounts can't post links.
    3. Content     — server-side profanity / spam-phrase block.

  Idempotent: CREATE OR REPLACE function; each trigger guarded by a table-exists
  check and DROP TRIGGER IF EXISTS. Reversible by dropping the triggers.
*/

CREATE OR REPLACE FUNCTION public.enforce_spam_guardrails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_json        jsonb := to_jsonb(NEW);
  v_actor_col   text  := TG_ARGV[0];
  v_max_per_min int   := TG_ARGV[1]::int;
  v_actor       uuid;
  v_text        text  := '';
  v_recent      int;
  v_role        text;
  v_verified    boolean;
  v_created     timestamptz;
  i             int;
BEGIN
  v_actor := NULLIF(v_json ->> v_actor_col, '')::uuid;
  -- Can't attribute the row to a user; leave it to RLS/auth to decide.
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Concatenate the text columns passed as the 3rd+ trigger args.
  IF array_length(TG_ARGV, 1) > 2 THEN
    FOR i IN 2 .. array_length(TG_ARGV, 1) - 1 LOOP
      v_text := v_text || ' ' || COALESCE(v_json ->> TG_ARGV[i], '');
    END LOOP;
  END IF;

  -- Trusted roles (church leaders/admins) are exempt from guardrails.
  SELECT role, is_verified, created_at
    INTO v_role, v_verified, v_created
    FROM public.users
    WHERE id = v_actor;
  IF v_role IN ('admin', 'host') THEN
    RETURN NEW;
  END IF;

  -- 1) Rate limit: cap inserts by this actor in the trailing 60 seconds.
  EXECUTE format(
    'SELECT count(*) FROM %I.%I WHERE %I = $1 AND created_at > now() - interval ''60 seconds''',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, v_actor_col
  ) INTO v_recent USING v_actor;
  IF v_recent >= v_max_per_min THEN
    RAISE EXCEPTION 'You''re doing that too fast. Please wait a moment and try again.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2) Link gate for unverified or brand-new accounts (the #1 spam vector).
  IF (COALESCE(v_verified, false) = false OR v_created > now() - interval '24 hours')
     AND v_text ~* '(https?://|www\.|t\.me/|bit\.ly|[a-z0-9][a-z0-9-]*\.(com|net|org|io|co|xyz|link|ru|cn|info|top|click|shop)\M)' THEN
    RAISE EXCEPTION 'Links aren''t allowed from new accounts yet — this helps us stop spam. Please try again once your account is verified.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3) Server-side content filter (hard gate behind the client-side one).
  IF v_text ~* '\m(viagra|casino|airdrop|forex|sportsbet|porn|xxx|onlyfans|f+u+c+k|s+h+i+t|b+i+t+c+h|c+u+n+t|n+i+g+g+)\M' THEN
    RAISE EXCEPTION 'Your message was blocked by our community filter.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach to each content table (only if the table exists), with per-table caps.
-- Trigger args must be a flat list of string literals, so the text columns are
-- expanded into individual quoted args here.
DO $$
DECLARE
  rec   record;
  col   text;
  args  text;
BEGIN
  FOR rec IN
    SELECT tbl, actor_col, max_min, text_cols FROM (VALUES
      ('topics'::text,    'author_id'::text, '5'::text, ARRAY['title', 'content']::text[]),
      ('community_posts', 'author_id', '5',  ARRAY['title', 'content']),
      ('comments',        'author_id', '8',  ARRAY['content']),
      ('direct_messages', 'sender_id', '15', ARRAY['content']),
      ('chat_messages',   'sender_id', '15', ARRAY['content']),
      ('reposts',         'user_id',   '10', ARRAY['quote_text'])
    ) AS t(tbl, actor_col, max_min, text_cols)
  LOOP
    IF to_regclass('public.' || rec.tbl) IS NOT NULL THEN
      args := quote_literal(rec.actor_col) || ', ' || quote_literal(rec.max_min);
      FOREACH col IN ARRAY rec.text_cols LOOP
        args := args || ', ' || quote_literal(col);
      END LOOP;

      EXECUTE format('DROP TRIGGER IF EXISTS trg_spam_guardrails ON public.%I', rec.tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_spam_guardrails BEFORE INSERT ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.enforce_spam_guardrails(%s)',
        rec.tbl, args
      );
    END IF;
  END LOOP;
END $$;
