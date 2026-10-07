/*
  # Make chat attachments private

  Previously chat-attachments was a public bucket (permanent public URLs — any
  one with the link could view). Flip it private: files are served via
  short-lived signed URLs, and only authenticated users can read. Upload stays
  owner-scoped; delete stays owner-only.

  Idempotent.
*/

UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Drop the old public-read policy.
DROP POLICY IF EXISTS "Chat attachments are publicly readable" ON storage.objects;

-- Read requires authentication; the app hands out short-lived signed URLs.
-- (Objects live under unguessable per-user paths and are only surfaced inside
-- the organizer chat, so this keeps them off the public internet.)
DROP POLICY IF EXISTS "Signed-in users can read chat attachments" ON storage.objects;
CREATE POLICY "Signed-in users can read chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

NOTIFY pgrst, 'reload schema';
