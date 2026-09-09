import React, { useState } from 'react';
import { Cake } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface AgeGateProps {
  // Called once the user answers. The bucketed birthdate is passed back so the
  // caller can route minors (under-18) to the read-only experience.
  onVerified: (birthdate?: string) => void;
  // 'account' (default): persist to the signed-in user's profile.
  // 'guest': no account yet — persist locally and surface Terms agreement, so
  // age is the only thing we ask of a guest before they can browse.
  mode?: 'account' | 'guest';
}

// Local key for a guest's confirmed age bucket (no account to write to).
export const GUEST_BIRTHDATE_KEY = 'wny_guest_birthdate';

// We ask a single yes/no question ("18 or older?") rather than an exact date of
// birth — it's clearer and matches the 18+ line on the sign-up form. We still
// persist the answer as a representative `birthdate` (Jan 1 of a year safely
// inside the chosen bucket) so all existing age routing keeps working unchanged.
function bucketBirthdate(isAdult: boolean): string {
  const year = new Date().getFullYear() - (isAdult ? 20 : 15);
  return `${year}-01-01`;
}

// Blocking, non-dismissable gate shown once to anyone whose age bucket we don't
// yet know. Confirms whether they are 18 or older before the app is usable.
export const AgeGate: React.FC<AgeGateProps> = ({ onVerified, mode = 'account' }) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const isGuest = mode === 'guest';

  const answer = async (isAdult: boolean) => {
    const birthdate = bucketBirthdate(isAdult);

    // Guest: no account to write to — persist the answer locally so we only ask
    // once, then let the caller route minors client-side.
    if (isGuest) {
      try { localStorage.setItem(GUEST_BIRTHDATE_KEY, birthdate); } catch { /* ignore */ }
      onVerified(birthdate);
      return;
    }

    if (!user) { onVerified(birthdate); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ birthdate })
        .eq('id', user.id);
      if (error) throw error;
      onVerified(birthdate);
    } catch (err: any) {
      toast.error(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-6"
      style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-7 text-center">
        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Cake className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">How old are you?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This helps us keep everyone safe. Under-18 accounts can read the card deck only.
        </p>
        <div className="space-y-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => answer(true)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm touch-manipulation"
          >
            I'm 18 or older
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => answer(false)}
            className="w-full py-3 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 font-semibold rounded-xl transition-colors text-sm touch-manipulation"
          >
            I'm under 18
          </button>
        </div>
        {isGuest && (
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            By continuing you agree to our{' '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>,{' '}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>, and Community Guidelines.
          </p>
        )}
      </div>
    </div>
  );
};
