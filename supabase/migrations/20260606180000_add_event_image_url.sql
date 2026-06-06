/*
  # Event photos

  - events.image_url: optional cover photo URL for an event
  - event-images storage bucket (public read, authenticated upload)
*/

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS image_url text;

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images');

-- Anyone can read (bucket is public)
DROP POLICY IF EXISTS "Public can read event images" ON storage.objects;
CREATE POLICY "Public can read event images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-images');

-- Owners can replace / delete their uploads
DROP POLICY IF EXISTS "Users can update their own event images" ON storage.objects;
CREATE POLICY "Users can update their own event images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own event images" ON storage.objects;
CREATE POLICY "Users can delete their own event images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND owner = auth.uid());

NOTIFY pgrst, 'reload schema';
