/*
  # Engagement notifications

  Reuses the existing notifications → push pipeline (AFTER INSERT trigger on
  public.notifications calls the send-push Edge Function). Adds:
    1. Team/volunteer notifications — host is pinged when someone claims a help
       role, offers to bring an item, or requests to co-host; the new co-host
       is pinged when approved. Covers both the shared-link flow and normal
       in-app volunteering (they all update the same rows).
    2. "Someone you follow posted" — followers (who haven't opted out) get a
       notification when a person they follow publishes a topic/community post.
    3. Topic of the Day — a daily pg_cron job pushes the day's topic to users
       who opted in.

  Uses existing notification types (general/role_request/volunteer_opportunity/
  cohost_added) so the type CHECK constraint is untouched. Routing is by the
  payload (topic_id / event_id).
*/

-- Opt-in / opt-out preferences (profile is fetched with select('*')).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notify_daily_topic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_followed_posts boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 1. Team / volunteer notifications
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_host_on_cohost_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host uuid; v_event text; v_name text;
BEGIN
  SELECT host_id, title INTO v_host, v_event FROM public.events WHERE id = NEW.event_id;
  SELECT name INTO v_name FROM public.users WHERE id = NEW.user_id;
  IF v_host IS NOT NULL AND v_host <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (v_host, 'role_request', 'New co-host request',
            COALESCE(v_name, 'Someone') || ' wants to co-host ' || COALESCE(v_event, 'your event'),
            jsonb_build_object('event_id', NEW.event_id));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_cohost_request ON public.event_cohost_requests;
CREATE TRIGGER trg_notify_cohost_request
  AFTER INSERT ON public.event_cohost_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_host_on_cohost_request();

CREATE OR REPLACE FUNCTION public.notify_host_on_help_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host uuid; v_event text; v_name text;
BEGIN
  IF NEW.assigned_user_id IS NOT NULL AND NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id THEN
    SELECT host_id, title INTO v_host, v_event FROM public.events WHERE id = NEW.event_id;
    SELECT name INTO v_name FROM public.users WHERE id = NEW.assigned_user_id;
    IF v_host IS NOT NULL AND v_host <> NEW.assigned_user_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, payload)
      VALUES (v_host, 'volunteer_opportunity', 'Someone signed up to help',
              COALESCE(v_name, 'Someone') || ' volunteered for "' || COALESCE(NEW.title, 'a role') || '"',
              jsonb_build_object('event_id', NEW.event_id));
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_help_claim ON public.event_help_requests;
CREATE TRIGGER trg_notify_help_claim
  AFTER UPDATE ON public.event_help_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_host_on_help_claim();

CREATE OR REPLACE FUNCTION public.notify_host_on_food_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host uuid; v_event text; v_name text;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    SELECT host_id, title INTO v_host, v_event FROM public.events WHERE id = NEW.event_id;
    SELECT name INTO v_name FROM public.users WHERE id = NEW.assigned_to;
    IF v_host IS NOT NULL AND v_host <> NEW.assigned_to THEN
      INSERT INTO public.notifications (user_id, type, title, body, payload)
      VALUES (v_host, 'volunteer_opportunity', 'Someone is bringing something',
              COALESCE(v_name, 'Someone') || ' is bringing "' || COALESCE(NEW.item, 'an item') || '"',
              jsonb_build_object('event_id', NEW.event_id));
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_food_claim ON public.food_items;
CREATE TRIGGER trg_notify_food_claim
  AFTER UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_host_on_food_claim();

CREATE OR REPLACE FUNCTION public.notify_cohost_on_add()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event text;
BEGIN
  IF NEW.user_id <> COALESCE(NEW.added_by, NEW.user_id) THEN
    SELECT title INTO v_event FROM public.events WHERE id = NEW.event_id;
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (NEW.user_id, 'cohost_added', 'You''re now a co-host',
            'You were added as a co-host for ' || COALESCE(v_event, 'an event'),
            jsonb_build_object('event_id', NEW.event_id));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_cohost_added ON public.event_cohosts;
CREATE TRIGGER trg_notify_cohost_added
  AFTER INSERT ON public.event_cohosts
  FOR EACH ROW EXECUTE FUNCTION public.notify_cohost_on_add();

-- ---------------------------------------------------------------------------
-- 2. "Someone you follow posted"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM public.users WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT f.follower_id, 'general',
         'New post from ' || COALESCE(v_name, 'someone you follow'),
         left(COALESCE(NEW.title, NEW.content, 'shared a new post'), 100),
         jsonb_build_object('topic_id', NEW.id)
  FROM public.follows f
  JOIN public.users u ON u.id = f.follower_id
  WHERE f.followed_id = NEW.author_id
    AND COALESCE(u.notify_followed_posts, true) = true;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_followers_topic ON public.topics;
CREATE TRIGGER trg_notify_followers_topic
  AFTER INSERT ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_post();

DROP TRIGGER IF EXISTS trg_notify_followers_community ON public.community_posts;
CREATE TRIGGER trg_notify_followers_community
  AFTER INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_post();

-- ---------------------------------------------------------------------------
-- 3. Topic of the Day (daily push to opted-in users)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_daily_topic()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_topic_id uuid; v_title text;
BEGIN
  SELECT id, title INTO v_topic_id, v_title
  FROM public.topics
  WHERE hidden_at IS NULL
  ORDER BY random()
  LIMIT 1;

  IF v_topic_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT u.id, 'general', 'Topic of the Day 📖',
         COALESCE(v_title, 'A new topic to reflect on today'),
         jsonb_build_object('topic_id', v_topic_id)
  FROM public.users u
  WHERE COALESCE(u.notify_daily_topic, false) = true
    AND u.banned_at IS NULL;
END; $$;

-- Schedule it (Supabase pg_cron). 13:00 UTC ≈ morning in North America.
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  PERFORM cron.unschedule('daily-topic-of-the-day');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('daily-topic-of-the-day', '0 13 * * *', $$ SELECT public.send_daily_topic(); $$);

NOTIFY pgrst, 'reload schema';
