import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface GuestRsvpModalProps {
  eventTitle: string;
  onSubmit: (name: string, email: string) => Promise<boolean>;
  onClose: () => void;
  onRequireAuth?: () => void;
}

// Lightweight RSVP for people who have the link but no account. Captures a name
// + email (for the host's headcount/accountability) and, on success, unlocks the
// event location. Guests can't help/chat/post — this is view + RSVP only.
export const GuestRsvpModal: React.FC<GuestRsvpModalProps> = ({ eventTitle, onSubmit, onClose, onRequireAuth }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please add your name'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { toast.error('Please enter a valid email'); return; }
    if (!agreed) { toast.error('Please agree to the Terms to RSVP'); return; }
    setSubmitting(true);
    await onSubmit(name.trim(), email.trim());
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">RSVP as a guest</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[280px]">{eventTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            RSVP to unlock the exact location. No account needed.
          </div>

          <div>
            <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your name</label>
            <input
              id="guest-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              id="guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Shared with the host so they know who's coming.</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span>
              I agree to the{' '}
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Terms</a>
              {' '}and{' '}
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Privacy Policy</a>.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors touch-manipulation"
          >
            {submitting ? 'Confirming…' : 'RSVP & unlock location'}
          </button>

          {onRequireAuth && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Prefer an account?{' '}
              <button type="button" onClick={onRequireAuth} className="text-blue-600 dark:text-blue-400 underline">Sign up free</button>
              {' '}to help out, chat, and save events.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
