import React, { useState } from 'react';
import { Cake } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface AgeGateProps {
  // Called after a valid birthdate (>= MIN_AGE) is saved.
  onVerified: () => void;
  // Called when the user is under the minimum age and must be signed out.
  onUnderage: () => void;
}

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
export const AgeGate: React.FC<AgeGateProps> = ({ onVerified, onUnderage }) => {
  const { user, signOut } = useAuth();
  const [birthdate, setBirthdate] = useState('');
  const [saving, setSaving] = useState(false);

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
      // Under the minimum — record nothing, sign out, and inform them.
      toast.error(`You must be at least ${MIN_AGE} to use Worship N Yaps.`);
      try { await signOut(); } catch { /* ignore */ }
      onUnderage();
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
      onVerified();
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
      </div>
    </div>
  );
};
