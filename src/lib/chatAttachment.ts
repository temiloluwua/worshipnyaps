import { supabase } from './supabase';

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = 'chat-attachments';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

const IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]);

export interface UploadedAttachment {
  // Storage object path (NOT a public URL) — the bucket is private, so we
  // store the path and mint short-lived signed URLs on demand to display it.
  path: string;
  type: 'image' | 'file';
  name: string;
}

export async function uploadChatAttachment(file: File, userId: string): Promise<UploadedAttachment> {
  if (file.size > MAX_BYTES) {
    throw new Error('File must be 10 MB or smaller.');
  }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || `file.${ext}`;
  const path = `${userId}/${Date.now()}-${safeBase}`;
  const isImage = file.type ? IMAGE_TYPES.has(file.type.toLowerCase()) : ['jpg','jpeg','png','webp','gif','heic','heif'].includes(ext);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) {
    throw new Error(error.message?.includes('mime') ? 'That file type isn’t supported.' : (error.message || 'Upload failed'));
  }
  return { path, type: isImage ? 'image' : 'file', name: file.name };
}

// Mint a short-lived signed URL for a private attachment. Accepts either a
// storage path (current) or a full http URL (legacy public uploads) and
// returns it directly in the latter case.
export async function getChatAttachmentUrl(pathOrUrl: string): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // legacy public URL
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}
