/*
  # More notification triggers + per-type push preferences

  ## Adds notification rows for three more social actions
    1. New follower            → notify the followed user   (type 'follow')
    2. Like on your topic/comment → notify the author        (type 'like')
    3. Repost of your topic    → notify the topic author     (type 'repost')
  (Self-actions never notify.)

  ## Lets users choose which pushes they get
  Adds per-type boolean prefs on users (default on, matching prior behavior).
  The push dispatcher checks the recipient's pref for the notification's type
  and skips the PUSH when it's off. The in-app notification row is still
  written, so the notifications tab remains a complete history.
*/

-- 1. Preference columns (default true so nothing changes until a user opts out).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notify_dm          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_comments    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_rsvps       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_connections boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reactions   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_follows     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reposts     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_events      boolean NOT NULL DEFAULT true;

-- 2a. New follower
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_follower_name text;
BEGIN
  IF NEW.follower_id = NEW.followed_id THEN RETURN NEW; END IF;
  SELECT name INTO v_follower_name FROM public.users WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    NEW.followed_id,
    'follow',
    COALESCE(v_follower_name, 'Someone') || ' started following you',
    '',
    jsonb_build_object('user_id', NEW.follower_id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS new_follower_notification ON public.follows;
CREATE TRIGGER new_follower_notification
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();

-- 2b. Like on your topic or comment
CREATE OR REPLACE FUNCTION public.notify_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_liker_name text;
BEGIN
  IF NEW.likeable_type = 'topic' THEN
    SELECT author_id INTO v_author FROM public.topics WHERE id = NEW.likeable_id;
  ELSIF NEW.likeable_type = 'comment' THEN
    SELECT author_id INTO v_author FROM public.comments WHERE id = NEW.likeable_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT name INTO v_liker_name FROM public.users WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    v_author,
    'like',
    COALESCE(v_liker_name, 'Someone') || ' liked your ' || NEW.likeable_type,
    '',
    jsonb_build_object('user_id', NEW.user_id, 'likeable_type', NEW.likeable_type, 'likeable_id', NEW.likeable_id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS like_notification ON public.likes;
CREATE TRIGGER like_notification
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_like();

-- 2c. Repost of your topic
CREATE OR REPLACE FUNCTION public.notify_repost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_reposter_name text;
BEGIN
  SELECT author_id INTO v_author FROM public.topics WHERE id = NEW.original_topic_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT name INTO v_reposter_name FROM public.users WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    v_author,
    'repost',
    COALESCE(v_reposter_name, 'Someone') || ' reposted your post',
    LEFT(COALESCE(NEW.quote_text, ''), 140),
    jsonb_build_object('user_id', NEW.user_id, 'topic_id', NEW.original_topic_id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS repost_notification ON public.reposts;
CREATE TRIGGER repost_notification
  AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.notify_repost();

-- 3. Push dispatcher now respects the recipient's per-type preference.
CREATE OR REPLACE FUNCTION public.dispatch_push_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_auth text;
  v_allowed boolean;
BEGIN
  -- Per-type opt-out (defaults true). The in-app row is already written;
  -- this only governs whether we also send a push.
  SELECT CASE NEW.type
           WHEN 'dm'                    THEN notify_dm
           WHEN 'comment'               THEN notify_comments
           WHEN 'rsvp'                  THEN notify_rsvps
           WHEN 'connection_request'    THEN notify_connections
           WHEN 'connection_accepted'   THEN notify_connections
           WHEN 'like'                  THEN notify_reactions
           WHEN 'follow'                THEN notify_follows
           WHEN 'repost'                THEN notify_reposts
           WHEN 'event'                 THEN notify_events
           WHEN 'event_update'          THEN notify_events
           WHEN 'event_reminder'        THEN notify_events
           WHEN 'event_cancelled'       THEN notify_events
           WHEN 'event_postponed'       THEN notify_events
           WHEN 'cohost_added'          THEN notify_events
           WHEN 'role_request'          THEN notify_events
           WHEN 'volunteer_opportunity' THEN notify_events
           ELSE true
         END
    INTO v_allowed
    FROM public.users WHERE id = NEW.user_id;
  IF v_allowed IS FALSE THEN RETURN NEW; END IF;

  v_url := COALESCE(
    NULLIF(current_setting('app.push_function_url', true), ''),
    'https://pobqjupcbhhkvparuszr.supabase.co/functions/v1/send-push'
  );
  v_auth := current_setting('app.push_function_auth', true);
  IF v_url IS NULL OR v_url = '' THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', COALESCE(v_auth, '')
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch_push_for_notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
