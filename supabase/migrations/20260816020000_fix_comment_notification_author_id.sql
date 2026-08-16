/*
  # Fix comment notifications: comments.author_id (not user_id)

  The comments table's author column is `author_id`, but notify_topic_comment()
  referenced NEW.user_id, so every comment insert failed with
  "record 'new' has no field 'user_id'" (blocking the comment box under posts).

  Redefine the function to use NEW.author_id. Author-only notification (no
  dependency on notification_subscriptions, which may not exist on this DB).
  Wrapped so a notification failure can never block the comment itself.
*/

CREATE OR REPLACE FUNCTION public.notify_topic_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_topic_author uuid;
  v_commenter_name text;
BEGIN
  IF NEW.topic_id IS NULL THEN RETURN NEW; END IF;
  SELECT author_id INTO v_topic_author FROM public.topics WHERE id = NEW.topic_id;
  IF v_topic_author IS NULL OR v_topic_author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT name INTO v_commenter_name FROM public.users WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    v_topic_author,
    'comment',
    COALESCE(v_commenter_name, 'Someone') || ' commented on your post',
    LEFT(COALESCE(NEW.content, ''), 140),
    jsonb_build_object('topic_id', NEW.topic_id, 'comment_id', NEW.id, 'user_id', NEW.author_id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a notification problem block someone from commenting.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS topic_comment_notification ON public.comments;
CREATE TRIGGER topic_comment_notification
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_topic_comment();

NOTIFY pgrst, 'reload schema';
