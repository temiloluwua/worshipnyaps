/*
  # Event-scoped topics with moderation

  A topic created from within an event now lives as a real topic tied to that
  event, visible to the event's people immediately, but kept OFF the public
  deck until an admin/moderator approves it.

  - topics.event_id: the event a topic was created in (NULL = a normal topic).
  - topics.moderation_status: 'pending' | 'approved' | 'rejected'.
      Existing rows default 'approved' (no behavior change for them).
  - SELECT policy: approved topics follow the usual public/friends rules;
    PENDING event topics are visible to the author, to anyone who can see the
    event (can_user_see_event), and to staff (is_staff = admin or moderator);
    rejected topics only to author + staff.
  - A trigger makes the server authoritative: a non-staff user creating an
    event topic is forced to 'pending', and only staff can change
    moderation_status — so a client can't self-approve.
  Idempotent.
*/

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_topics_moderation_status ON public.topics(moderation_status);
CREATE INDEX IF NOT EXISTS idx_topics_event_id ON public.topics(event_id);

-- SELECT visibility: approved (public/friends/author) + pending-for-event-viewers + staff.
DROP POLICY IF EXISTS "Topics are viewable based on visibility" ON public.topics;
CREATE POLICY "Topics are viewable based on visibility"
  ON public.topics FOR SELECT
  TO authenticated
  USING (
    author_id = (select auth.uid())
    OR public.is_staff((select auth.uid()))
    OR (
      moderation_status = 'approved'
      AND (
        visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM public.connections c
          WHERE (
            (c.user_id = (select auth.uid()) AND c.connected_user_id = topics.author_id)
            OR (c.connected_user_id = (select auth.uid()) AND c.user_id = topics.author_id)
          )
          AND c.status = 'active'
        )
      )
    )
    OR (
      moderation_status = 'pending'
      AND event_id IS NOT NULL
      AND public.can_user_see_event(event_id, (select auth.uid()))
    )
  );

-- Staff can update any topic (needed to approve/reject others' submissions).
DROP POLICY IF EXISTS "Staff can moderate topics" ON public.topics;
CREATE POLICY "Staff can moderate topics"
  ON public.topics FOR UPDATE
  TO authenticated
  USING (public.is_staff((select auth.uid())))
  WITH CHECK (public.is_staff((select auth.uid())));

-- Server-authoritative moderation: non-staff can't publish an event topic or
-- change a moderation_status. Runs SECURITY DEFINER so is_staff() resolves.
CREATE OR REPLACE FUNCTION public.enforce_topic_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.event_id IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
      NEW.moderation_status := 'pending';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
       AND NOT public.is_staff(auth.uid()) THEN
      NEW.moderation_status := OLD.moderation_status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_topic_moderation ON public.topics;
CREATE TRIGGER trg_enforce_topic_moderation
  BEFORE INSERT OR UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.enforce_topic_moderation();

NOTIFY pgrst, 'reload schema';
