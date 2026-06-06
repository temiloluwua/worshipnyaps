import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadEventImage } from '../../lib/eventImage';
import { useAuth } from '../../hooks/useAuth';

interface EventImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export const EventImageUploader: React.FC<EventImageUploaderProps> = ({ value, onChange, label = 'Cover photo (optional)' }) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error('Sign in to upload a photo');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadEventImage(file, user.id);
      onChange(url);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={value} alt="Event cover" className="w-full aspect-video object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-white/90 text-gray-900 text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Replace'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Camera className="w-6 h-6" />
          )}
          <span className="text-sm">{uploading ? 'Uploading…' : 'Tap to add a cover photo'}</span>
          <span className="text-xs text-gray-400">JPG, PNG, WebP — up to 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
