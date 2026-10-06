import { supabase } from './supabase';

const MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]);

export interface UploadedAttachment {
  url: string;
  type: 'image' | 'file';
  name: string;
}

// Uploads a chat attachment to the public `chat-attachments` bucket and returns
// its URL, kind (image vs file), and original name. The bucket enforces the
// size + mime allow-list server-side; we surface a friendly error if rejected.
export async function uploadChatAttachment(file: File, userId: string): Promise<UploadedAttachment> {
  if (file.size > MAX_BYTES) {
    throw new Error('File must be 10 MB or smaller.');
  }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || `file.${ext}`;
  const path = `${userId}/${Date.now()}-${safeBase}`;
  const isImage = file.type ? IMAGE_TYPES.has(file.type.toLowerCase()) : ['jpg','jpeg','png','webp','gif','heic','heif'].includes(ext);

  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) {
    // Supabase returns a generic error when the mime allow-list rejects a file.
    throw new Error(error.message?.includes('mime') ? 'That file type isn’t supported.' : (error.message || 'Upload failed'));
  }

  const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path);
  return { url: publicUrl, type: isImage ? 'image' : 'file', name: file.name };
}
