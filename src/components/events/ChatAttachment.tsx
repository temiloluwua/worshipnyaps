import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { getChatAttachmentUrl } from '../../lib/chatAttachment';

interface ChatAttachmentProps {
  path: string; // storage path (or legacy full URL)
  type?: 'image' | 'file' | null;
  name?: string | null;
  isOwn: boolean;
}

// Renders a private chat attachment by minting a short-lived signed URL for its
// storage path. Images show inline; files show as a labeled open/download link.
export const ChatAttachment: React.FC<ChatAttachmentProps> = ({ path, type, name, isOwn }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getChatAttachmentUrl(path).then((u) => {
      if (cancelled) return;
      if (u) setUrl(u); else setFailed(true);
    });
    return () => { cancelled = true; };
  }, [path]);

  if (failed) {
    return <div className="text-xs italic opacity-70 mb-1">Attachment unavailable</div>;
  }
  if (!url) {
    return (
      <div className="flex items-center gap-2 mb-1 text-xs opacity-80">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading attachment…
      </div>
    );
  }

  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mb-1">
        <img src={url} alt={name || 'image'} className="max-h-56 rounded-lg object-cover" loading="lazy" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-lg ${isOwn ? 'bg-amber-700/50' : 'bg-gray-300/60 dark:bg-gray-600/60'}`}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="text-sm underline break-all">{name || 'Download file'}</span>
    </a>
  );
};
