import React, { useState } from 'react';
import { X, BookOpen, MessageCircle } from 'lucide-react';
import type { Event as DbEvent } from '../../lib/supabase';

interface RSVPDisclaimerModalProps {
  event: DbEvent;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

const LOCATION_TYPE_DISPLAY: Record<string, string> = {
  home: '🏠 Home',
  church: '⛪ Church',
  park: '🌿 Park / Outdoors',
  cafe: '☕ Café',
  online: '💻 Online',
};

export const RSVPDisclaimerModal: React.FC<RSVPDisclaimerModalProps> = ({
  event,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const isBibleStudy = (event.event_type || 'bible_study') === 'bible_study';
  const canConfirm = !confirming;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !confirming && onClose()}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Before you RSVP</h2>
          <button onClick={onClose} disabled={confirming} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isBibleStudy
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          }`}>
            {isBibleStudy ? <BookOpen className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
            {isBibleStudy ? 'Bible Study' : 'Yap'}
          </span>
          {event.location_type && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {LOCATION_TYPE_DISPLAY[event.location_type] || event.location_type}
            </span>
          )}
        </div>

        {isBibleStudy && event.study_topic && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Studying</p>
            <p className="text-sm text-blue-900 dark:text-blue-100">{event.study_topic}</p>
          </div>
        )}


        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={confirming}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming ? 'Confirming...' : 'Confirm RSVP'}
          </button>
        </div>
      </div>
    </div>
  );
};
