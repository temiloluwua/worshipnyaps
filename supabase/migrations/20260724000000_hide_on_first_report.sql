/*
  # Hide reported posts on the FIRST report (pending moderator approval)

  Previously content was auto-hidden only after 2 distinct reporters. Apple 1.2
  wants reported content acted on fast, so we now hide a post the moment it is
  reported and keep it hidden until a moderator restores it (approve) or
  removes it. Restoring/removing is done via staff-only SECURITY DEFINER RPCs.
*/

-- 1. Hide on first report (replaces the >= 2 threshold logic).
CREATE OR REPLACE FUNCTION public.auto_hide_after_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reported_community_post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET hidden_at = COALESCE(hidden_at, now())
    WHERE id = NEW.reported_community_post_id;
  ELSIF NEW.reported_topic_id IS NOT NULL THEN
    UPDATE public.topics
    SET hidden_at = COALESCE(hidden_at, now())
    WHERE id = NEW.reported_topic_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the report itself if the hide-update fails.
  RAISE WARNING 'auto_hide_after_reports failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
-- The AFTER INSERT trigger (trg_auto_hide_after_reports) already exists and
-- points at this function, so replacing the function is enough.

-- 2. Moderator: restore (unhide) or re-hide a post.
CREATE OR REPLACE FUNCTION public.moderator_set_content_hidden(p_kind text, p_id uuid, p_hidden boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_kind = 'topic' THEN
    UPDATE public.topics SET hidden_at = CASE WHEN p_hidden THEN now() ELSE NULL END WHERE id = p_id;
  ELSIF p_kind = 'community_post' THEN
    UPDATE public.community_posts SET hidden_at = CASE WHEN p_hidden THEN now() ELSE NULL END WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unknown content kind: %', p_kind;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.moderator_set_content_hidden(text, uuid, boolean) TO authenticated;

-- 3. Moderator: delete a reported post outright.
CREATE OR REPLACE FUNCTION public.moderator_delete_content(p_kind text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_kind = 'topic' THEN
    DELETE FROM public.topics WHERE id = p_id;
  ELSIF p_kind = 'community_post' THEN
    DELETE FROM public.community_posts WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unknown content kind: %', p_kind;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.moderator_delete_content(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
