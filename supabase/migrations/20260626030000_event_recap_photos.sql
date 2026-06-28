/*
  # Event recap photos

  ## Why
  After an event ends, hosts and attendees should be able to share photos
  to look back on. Right now there's nowhere to put them — they live in
  random group chats or get lost in DMs.

  ## What
  - event_photos(id, event_id, uploader_id, image_url, caption, created_at).
  - RLS: anyone who can see the event can see its photos; only attendees,
    cohosts, and the host can upload; uploaders + the host + staff can delete.
  - Reuses the existing 'event-images' storage bucket for the actual files
    (no new bucket needed).
*/

CREATE TABLE IF NOT EXISTS public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_event ON public.event_photos(event_id, created_at DESC);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

-- View: anyone who can see the event can see its photos.
DROP POLICY IF EXISTS "View photos for visible events" ON public.event_photos;
CREATE POLICY "View photos for visible events"
  ON public.event_photos FOR SELECT TO authenticated
  USING (
    public.can_user_see_event(event_id, (select auth.uid()))
  );

-- Upload: must be the host, a cohost, or a registered attendee.
DROP POLICY IF EXISTS "Attendees and hosts can upload" ON public.event_photos;
CREATE POLICY "Attendees and hosts can upload"
  ON public.event_photos FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = (select auth.uid())
    AND (
      EXISTS (SELECT 1 FROM public.events e
              WHERE e.id = event_id AND e.host_id = (select auth.uid()))
      OR public.is_event_cohost(event_id, (select auth.uid()))
      OR public.is_event_attendee(event_id, (select auth.uid()))
    )
  );

-- Delete: uploader, event host, or staff.
DROP POLICY IF EXISTS "Uploader host or staff can delete" ON public.event_photos;
CREATE POLICY "Uploader host or staff can delete"
  ON public.event_photos FOR DELETE TO authenticated
  USING (
    uploader_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.events e
               WHERE e.id = event_id AND e.host_id = (select auth.uid()))
    OR public.is_staff((select auth.uid()))
  );

NOTIFY pgrst, 'reload schema';
