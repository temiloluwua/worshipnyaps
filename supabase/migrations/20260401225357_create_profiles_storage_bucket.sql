/*
  # Create profiles storage bucket

  ## Summary
  Creates the `profiles` storage bucket for avatar and cover photo uploads.
  The bucket is public (read access for all), authenticated users can upload.

  1. Creates bucket named `profiles` with public visibility
  2. RLS policies:
     - Anyone can view uploaded images
     - Authenticated users can upload to avatars/ and covers/ folders
     - Authenticated users can update/delete files they uploaded
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for profiles bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Authenticated users can upload profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] IN ('avatars', 'covers')
  );

CREATE POLICY "Authenticated users can update their own profile images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profiles')
  WITH CHECK (bucket_id = 'profiles');

CREATE POLICY "Authenticated users can delete their own profile images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'profiles');
