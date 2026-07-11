import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface DocModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  // Path to a bundled static HTML file, e.g. "/terms.html". Loaded from the
  // app's own bundle so it works offline and doesn't depend on the website.
  path: string;
}

// Renders a bundled static HTML page (terms/privacy/support) inside the app.
// We fetch the file from the local origin and drop it into an iframe via
// srcDoc so the page keeps its own styling without navigating the app away.
export const DocModal: React.FC<DocModalProps> = ({ isOpen, onClose, title, path }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setHtml(null);
    setFailed(false);
    let cancelled = false;
    fetch(path)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => { if (!cancelled) setHtml(text); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [isOpen, path]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white truncate pr-3">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 bg-white overflow-hidden">
        {failed ? (
          <div className="p-6 text-center text-sm text-gray-600">
            Couldn't load this page. Please try again.
          </div>
        ) : html === null ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : (
          <iframe
            title={title}
            srcDoc={html}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className="w-full h-full border-0"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          />
        )}
      </div>
    </div>
  );
};
