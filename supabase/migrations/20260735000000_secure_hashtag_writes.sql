/*
  # Secure hashtag writes

  The client incremented hashtag usage by reading a row then UPDATE-ing it,
  which required the policy `hashtags FOR UPDATE USING (true)` — i.e. ANY
  authenticated user could rewrite ANY hashtag row (tamper with counts, etc.).

  Replace that with an atomic SECURITY DEFINER RPC that upserts + increments,
  then drop the write-anything UPDATE policy. Reads stay public (SELECT
  policy untouched). Direct client INSERTs are no longer needed either, but we
  leave any existing INSERT policy in place to avoid breaking older clients.
*/

-- Needed for the atomic upsert below (idempotent). If this errors on
-- duplicate names, dedupe public.hashtags on name first, then re-run.
CREATE UNIQUE INDEX IF NOT EXISTS hashtags_name_key ON public.hashtags (name);

CREATE OR REPLACE FUNCTION public.get_or_create_hashtag(p_name text)
RETURNS public.hashtags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_row  public.hashtags;
BEGIN
  -- Normalize the same way the client did: lowercase, strip non-alphanumerics.
  v_name := lower(regexp_replace(coalesce(p_name, ''), '[^a-z0-9]', '', 'gi'));
  IF v_name = '' THEN
    RAISE EXCEPTION 'invalid hashtag';
  END IF;

  INSERT INTO public.hashtags (name, usage_count)
    VALUES (v_name, 1)
    ON CONFLICT (name) DO UPDATE SET usage_count = public.hashtags.usage_count + 1
    RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_hashtag(text) TO authenticated;

-- Remove the "any authenticated user can update any hashtag" policy — counts
-- now flow through the definer RPC above, which runs with owner privileges.
DROP POLICY IF EXISTS "System can update hashtag counts" ON public.hashtags;

NOTIFY pgrst, 'reload schema';
