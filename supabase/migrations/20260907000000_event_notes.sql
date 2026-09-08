/*
  # Event notes

  Attendees/hosts can jot notes during and after an event. The author sees their
  own notes; the host/co-hosts and admins can read all notes for the event
  (admins then curate them into new discussion topics).

  Reuses the SECURITY DEFINER helpers can_access_event / can_manage_event from
  the polls migration.
*/

CREATE TABLE IF NOT EXISTS public.event_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_notes_event ON public.event_notes(event_id, created_at DESC);

ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;

-- Read: your own notes, or (host/co-host/admin) all notes for the event.
DROP POLICY IF EXISTS "Read event notes" ON public.event_notes;
CREATE POLICY "Read event notes"
  ON public.event_notes FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR public.can_manage_event(event_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Write your own note on an event you can access.
DROP POLICY IF EXISTS "Add own event note" ON public.event_notes;
CREATE POLICY "Add own event note"
  ON public.event_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_access_event(event_id, auth.uid()));

DROP POLICY IF EXISTS "Edit own event note" ON public.event_notes;
CREATE POLICY "Edit own event note"
  ON public.event_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Delete own event note" ON public.event_notes;
CREATE POLICY "Delete own event note"
  ON public.event_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());
