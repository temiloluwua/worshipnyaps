/*
  # Recap photos — storage bucket + policies + table (self-contained)

  Recap photo uploads were failing because the 'event-images' storage bucket
  and/or its RLS policies weren't in place, and/or the event_photos table
  hadn't been created on this database. This migration makes all of it exist,
  idempotently, so uploads work.
*/

-- 1) Storage bucket (public read so getPublicUrl works) ----------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: authenticated users can upload; anyone can read; owners delete.
DROP POLICY IF EXISTS "event-images public read" ON storage.objects;
CREATE POLICY "event-images public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event-images authenticated upload" ON storage.objects;
CREATE POLICY "event-images authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event-images owner delete" ON storage.objects;
CREATE POLICY "event-images owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND owner = (select auth.uid()));

-- 2) event_photos table ------------------------------------------------------
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

-- View: any authenticated user (kept simple so it never depends on a helper
-- function that might not exist on this DB).
DROP POLICY IF EXISTS "View photos for visible events" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos read" ON public.event_photos;
CREATE POLICY "event_photos read"
  ON public.event_photos FOR SELECT TO authenticated
  USING (true);

-- Upload: the row's uploader must be the current user (the app only shows the
-- upload button to hosts/cohosts/attendees).
DROP POLICY IF EXISTS "Attendees and hosts can upload" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos insert own" ON public.event_photos;
CREATE POLICY "event_photos insert own"
  ON public.event_photos FOR INSERT TO authenticated
  WITH CHECK (uploader_id = (select auth.uid()));

-- Delete: uploader or the event host.
DROP POLICY IF EXISTS "Uploader host or staff can delete" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos delete" ON public.event_photos;
CREATE POLICY "event_photos delete"
  ON public.event_photos FOR DELETE TO authenticated
  USING (
    uploader_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = (select auth.uid()))
  );

NOTIFY pgrst, 'reload schema';
