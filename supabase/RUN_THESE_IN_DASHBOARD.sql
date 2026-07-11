-- ===========================================================================
-- Worship N Yaps — pending migrations to run in the Supabase SQL editor
-- Safe to run more than once (idempotent). Paste the whole file and Run.
-- ===========================================================================

-- 1) AGE GATE (CRITICAL) -----------------------------------------------------
-- Without this the birthdate age gate can't save and users get stuck.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birthdate date;

-- 2) NOTIFICATION SUBSCRIPTIONS (bell toggle on topics/events) ---------------
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('topic', 'event')),
  target_id uuid NOT NULL,
  subscribed boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own notification subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users manage their own notification subscriptions"
  ON public.notification_subscriptions FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE INDEX IF NOT EXISTS idx_notif_subs_target ON public.notification_subscriptions(target_type, target_id);

CREATE OR REPLACE FUNCTION public.notify_topic_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_topic_author uuid; v_topic_title text; v_commenter_name text;
BEGIN
  SELECT author_id, title INTO v_topic_author, v_topic_title FROM public.topics WHERE id = NEW.topic_id;
  SELECT name INTO v_commenter_name FROM public.users WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT r.uid, 'comment',
    COALESCE(v_commenter_name,'Someone') || ' commented on ' || CASE WHEN r.uid = v_topic_author THEN 'your post' ELSE 'a post you follow' END,
    LEFT(COALESCE(NEW.content,''),140),
    jsonb_build_object('topic_id',NEW.topic_id,'comment_id',NEW.id,'user_id',NEW.user_id)
  FROM (
    SELECT v_topic_author AS uid WHERE v_topic_author IS NOT NULL
    UNION
    SELECT ns.user_id FROM public.notification_subscriptions ns
    WHERE ns.target_type='topic' AND ns.target_id=NEW.topic_id AND ns.subscribed=true
  ) r
  WHERE r.uid <> NEW.user_id
    AND NOT EXISTS (SELECT 1 FROM public.notification_subscriptions m
      WHERE m.user_id=r.uid AND m.target_type='topic' AND m.target_id=NEW.topic_id AND m.subscribed=false);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS topic_comment_notification ON public.comments;
CREATE TRIGGER topic_comment_notification AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_topic_comment();

CREATE OR REPLACE FUNCTION public.notify_event_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event_title text; v_author_name text;
BEGIN
  SELECT title INTO v_event_title FROM public.events WHERE id = NEW.event_id;
  SELECT name INTO v_author_name FROM public.users WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT ea.user_id, 'event_update', 'Update for ' || COALESCE(v_event_title,'an event'),
    LEFT(COALESCE(NEW.content,''),140),
    jsonb_build_object('event_id',NEW.event_id,'announcement_id',NEW.id)
  FROM public.event_attendees ea
  WHERE ea.event_id=NEW.event_id AND ea.status='registered' AND ea.user_id <> NEW.author_id
    AND NOT EXISTS (SELECT 1 FROM public.notification_subscriptions m
      WHERE m.user_id=ea.user_id AND m.target_type='event' AND m.target_id=NEW.event_id AND m.subscribed=false);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS event_announcement_notification ON public.event_announcements;
CREATE TRIGGER event_announcement_notification AFTER INSERT ON public.event_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_announcement();

-- 3) POLYMORPHIC REPOSTS (repost/quote community posts, render in feed) ------
ALTER TABLE public.reposts DROP CONSTRAINT IF EXISTS reposts_original_topic_id_fkey;
ALTER TABLE public.reposts ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'topic'
  CHECK (source_type IN ('topic','community_post'));
CREATE INDEX IF NOT EXISTS idx_reposts_created ON public.reposts(created_at DESC);

-- Refresh PostgREST schema cache so the app sees the new columns/tables.
NOTIFY pgrst, 'reload schema';
