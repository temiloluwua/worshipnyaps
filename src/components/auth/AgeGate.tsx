import React, { useState } from 'react';
import { Cake } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface AgeGateProps {
  // Called after a valid birthdate (>= MIN_AGE) is saved. In guest mode the
  // saved birthdate is passed back so the caller can route minors.
  onVerified: (birthdate?: string) => void;
  // Called when the user is under the minimum age and must be signed out.
  onUnderage: () => void;
  // 'account' (default): persist to the signed-in user's profile.
  // 'guest': no account yet — persist locally and surface Terms agreement, so
  // age is the only thing we ask of a guest before they can browse.
  mode?: 'account' | 'guest';
}

// Local key for a guest's confirmed date of birth (no account to write to).
export const GUEST_BIRTHDATE_KEY = 'wny_guest_birthdate';

const MIN_AGE = 13;

function ageFromBirthdate(birthdate: string): number {
  const dob = new Date(`${birthdate}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

// Blocking, non-dismissable gate shown once to any signed-in user who hasn't
// recorded a birthdate yet. Confirms the 13+ minimum before the app is usable.
export const AgeGate: React.FC<AgeGateProps> = ({ onVerified, onUnderage, mode = 'account' }) => {
  const { user, signOut } = useAuth();
  const [birthdate, setBirthdate] = useState('');
  const [saving, setSaving] = useState(false);
  const isGuest = mode === 'guest';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthdate) {
      toast.error('Please enter your date of birth.');
      return;
    }
    const age = ageFromBirthdate(birthdate);
    if (isNaN(age) || age < 0 || age > 120) {
      toast.error('Please enter a valid date of birth.');
      return;
    }
    if (age < MIN_AGE) {
      // Under the minimum — record nothing, sign out (if any), and inform them.
      toast.error(`You must be at least ${MIN_AGE} to use Worship N Yaps.`);
      if (!isGuest) { try { await signOut(); } catch { /* ignore */ } }
      onUnderage();
      return;
    }

    // Guest: no account to write to — persist the confirmed DOB locally so we
    // only ask once, and route minors client-side.
    if (isGuest) {
      try { localStorage.setItem(GUEST_BIRTHDATE_KEY, birthdate); } catch { /* ignore */ }
      onVerified(birthdate);
      return;
    }

    if (!user) return;
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

  // Cap the selectable date at today.
  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-[80] bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-6"
      style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-7 text-center">
        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Cake className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Confirm your age</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter your date of birth to continue. You must be at least {MIN_AGE} years old.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="date"
            value={birthdate}
            max={todayIso}
            onChange={(e) => setBirthdate(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm touch-manipulation"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
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
