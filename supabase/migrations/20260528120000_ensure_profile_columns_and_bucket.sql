/*
  # Ensure profile columns, storage bucket, and policies exist

  ## Summary
  Earlier migrations added: users.interests, users.spiritual_gifts,
  users.cover_photo_url, users.location_text, and the `profiles` storage
  bucket with RLS policies. If those migrations were never applied to a
  given Supabase project, the EditProfileModal silently fails to save
  spiritual gifts / interests, and uploads of avatar / cover photos fail.

  This idempotent migration ensures all of them exist.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[];

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS spiritual_gifts text[] DEFAULT '{}'::text[];

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS location_text text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read access for profiles bucket" ON storage.objects;
CREATE POLICY "Public read access for profiles bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Authenticated users can upload profile images" ON storage.objects;
CREATE POLICY "Authenticated users can upload profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] IN ('avatars', 'covers')
  );

DROP POLICY IF EXISTS "Authenticated users can update their own profile images" ON storage.objects;
CREATE POLICY "Authenticated users can update their own profile images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profiles')
  WITH CHECK (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Authenticated users can delete their own profile images" ON storage.objects;
CREATE POLICY "Authenticated users can delete their own profile images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'profiles');

NOTIFY pgrst, 'reload schema';
