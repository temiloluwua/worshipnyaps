/*
  # Events that belong to a group (Milestone 2)

  An event can be scoped to a group. Group members can see the group's events
  (regardless of the event's own visibility), the event shows in the group's
  Events tab, and on creation the group is notified + a note is posted to the
  group chat.
*/

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_group ON public.events(group_id) WHERE group_id IS NOT NULL;

-- Additive (permissive) SELECT policy: group members can always read their
-- group's events. Permissive policies are OR'd, so this only grants access —
-- it can't restrict the existing public/host/friends policies.
DROP POLICY IF EXISTS "events_group_members_select" ON public.events;
CREATE POLICY "events_group_members_select" ON public.events FOR SELECT TO authenticated
  USING (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()));

-- On a new group event: notify members + drop a note in the group chat.
CREATE OR REPLACE FUNCTION public.on_group_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv uuid; v_gname text;
BEGIN
  IF NEW.group_id IS NULL THEN RETURN NEW; END IF;
  SELECT conversation_id, name INTO v_conv, v_gname FROM public.groups WHERE id = NEW.group_id;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT gm.user_id, 'event', 'New event in ' || COALESCE(v_gname, 'your group'),
         COALESCE(NEW.title, 'A new gathering') || ' · ' || COALESCE(NEW.date::text, ''),
         jsonb_build_object('event_id', NEW.id, 'group_id', NEW.group_id)
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.user_id <> NEW.host_id;

  IF v_conv IS NOT NULL THEN
    INSERT INTO public.direct_messages (conversation_id, sender_id, content)
    VALUES (v_conv, NEW.host_id, '📅 New event: ' || COALESCE(NEW.title, 'gathering') || ' on ' || COALESCE(NEW.date::text, ''));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_on_group_event_created ON public.events;
CREATE TRIGGER trg_on_group_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.on_group_event_created();

NOTIFY pgrst, 'reload schema';
