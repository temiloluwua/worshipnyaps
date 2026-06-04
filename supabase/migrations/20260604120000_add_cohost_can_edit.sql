/*
  # Add can_edit flag to co-hosts + allow can_edit co-hosts to update events

  - event_cohosts.can_edit (bool, default false). When true, the co-host can
    edit/cancel/postpone the event, mirroring the host.
  - Drop & recreate the events UPDATE policy so it accepts either the host
    or a can_edit co-host.

  Idempotent.
*/

ALTER TABLE public.event_cohosts
  ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Hosts can update events" ON public.events;
DROP POLICY IF EXISTS "Hosts and co-hosts with edit can update events" ON public.events;
CREATE POLICY "Hosts and co-hosts with edit can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    host_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_cohosts c
      WHERE c.event_id = events.id
        AND c.user_id = (select auth.uid())
        AND c.can_edit = true
    )
  )
  WITH CHECK (
    host_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_cohosts c
      WHERE c.event_id = events.id
        AND c.user_id = (select auth.uid())
        AND c.can_edit = true
    )
  );

NOTIFY pgrst, 'reload schema';
