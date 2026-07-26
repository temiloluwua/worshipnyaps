/*
  # Recurring events (Milestone 2)

  A recurring event (e.g. a weekly small-group meeting) is materialized as a
  set of normal event rows sharing a recurrence_group_id, so each occurrence
  keeps its own RSVPs, chat, help/food roles, etc. The first occurrence is the
  "seed"; the rest are marked is_recurrence_child so the group-event trigger
  only notifies/posts-to-chat once (not once per generated occurrence).
*/

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence text CHECK (recurrence IN ('weekly', 'biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid,
  ADD COLUMN IF NOT EXISTS is_recurrence_child boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_recurrence_group
  ON public.events(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;

-- Only fire the group notification/chat post for the seed occurrence, so a
-- recurring series doesn't spam the group with N notifications on creation.
CREATE OR REPLACE FUNCTION public.on_group_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv uuid; v_gname text;
BEGIN
  IF NEW.group_id IS NULL OR NEW.is_recurrence_child THEN RETURN NEW; END IF;
  SELECT conversation_id, name INTO v_conv, v_gname FROM public.groups WHERE id = NEW.group_id;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT gm.user_id, 'event', 'New event in ' || COALESCE(v_gname, 'your group'),
         COALESCE(NEW.title, 'A new gathering') || ' · ' || COALESCE(NEW.date::text, '')
           || CASE WHEN NEW.recurrence IS NOT NULL THEN ' (repeats ' || NEW.recurrence || ')' ELSE '' END,
         jsonb_build_object('event_id', NEW.id, 'group_id', NEW.group_id)
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.user_id <> NEW.host_id;

  IF v_conv IS NOT NULL THEN
    INSERT INTO public.direct_messages (conversation_id, sender_id, content)
    VALUES (v_conv, NEW.host_id, '📅 New event: ' || COALESCE(NEW.title, 'gathering') || ' on ' || COALESCE(NEW.date::text, '')
      || CASE WHEN NEW.recurrence IS NOT NULL THEN ' (repeats ' || NEW.recurrence || ')' ELSE '' END);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

NOTIFY pgrst, 'reload schema';
