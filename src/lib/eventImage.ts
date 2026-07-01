import { supabase } from './supabase';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  // iPhone default camera formats — WKWebView often keeps them as HEIC unless
  // the user picks "Most Compatible" in Settings. Storage stores the bytes
  // fine; browsers that can't render will fall back to the raw download.
  'image/heic', 'image/heif',
]);
const ACCEPTED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

export async function uploadEventImage(file: File, userId: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  // Some iOS Safari builds hand us an empty `file.type` for HEIC — fall back
  // to matching on the file extension so the upload isn't blocked.
  const typeOk = file.type ? ACCEPTED_TYPES.has(file.type.toLowerCase()) : ACCEPTED_EXTS.has(ext);
  if (!typeOk) {
    throw new Error('Please use a JPG, PNG, HEIC, WebP, or GIF image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 10 MB or smaller.');
  }

  const path = `${userId}/${Date.now()}.${ext}`;
  const contentType = file.type || (ext === 'heic' ? 'image/heic' : ext === 'heif' ? 'image/heif' : 'image/jpeg');

  const { error: uploadError } = await supabase.storage
    .from('event-images')
    .upload(path, file, { upsert: false, contentType });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('event-images')
    .getPublicUrl(path);

  return publicUrl;
}
