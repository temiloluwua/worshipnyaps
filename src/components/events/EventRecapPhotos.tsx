import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { uploadEventImage } from '../../lib/eventImage';

interface Photo {
  id: string;
  uploader_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  uploader?: { name?: string; avatar_url?: string } | null;
}

interface EventRecapPhotosProps {
  eventId: string;
  hostId: string;
  canUpload: boolean;
}

export const EventRecapPhotos: React.FC<EventRecapPhotosProps> = ({ eventId, hostId, canUpload }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('event_photos')
        .select('id, uploader_id, image_url, caption, created_at, uploader:users!event_photos_uploader_id_fkey(name, avatar_url)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPhotos((data || []) as unknown as Photo[]);
    } catch (err) {
      console.error('event_photos fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPhotos(); }, [eventId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    let added = 0;
    try {
      for (const file of Array.from(files)) {
        const url = await uploadEventImage(file, user.id);
        const { error } = await supabase
          .from('event_photos')
          .insert({ event_id: eventId, uploader_id: user.id, image_url: url });
        if (error) throw error;
        added++;
      }
      await fetchPhotos();
      toast.success(`Added ${added} ${added === 1 ? 'photo' : 'photos'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      const { error } = await supabase.from('event_photos').delete().eq('id', photo.id);
      if (error) throw error;
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setLightbox(null);
      toast.success('Photo deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  if (loading) {
    return <div className="p-5 text-center text-sm text-gray-500 dark:text-gray-400">Loading photos…</div>;
  }

  if (photos.length === 0 && !canUpload) return null;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Recap photos {photos.length > 0 && <span className="text-xs text-gray-400">· {photos.length}</span>}
        </h3>
        {canUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            {uploading ? 'Uploading…' : 'Add photo'}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No photos yet. Be the first to share one.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:opacity-90 transition-opacity"
            >
              <img src={p.image_url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.image_url} alt={lightbox.caption || ''} className="w-full max-h-[85vh] object-contain rounded-xl" />
            <div className="absolute top-2 right-2 flex gap-2">
              {(lightbox.uploader_id === user?.id || hostId === user?.id) && (
                <button
                  onClick={() => handleDelete(lightbox)}
                  className="p-2 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors"
                  title="Delete photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setLightbox(null)}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {lightbox.uploader?.name && (
              <p className="text-white/80 text-xs mt-3 text-center">Shared by {lightbox.uploader.name}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
