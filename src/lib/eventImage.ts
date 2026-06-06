import { supabase } from './supabase';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadEventImage(file: File, userId: string): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Please use a JPG, PNG, WebP, or GIF image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('event-images')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('event-images')
    .getPublicUrl(path);

  return publicUrl;
}
