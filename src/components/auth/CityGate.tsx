import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { SUPPORTED_CITIES } from '../../lib/cities';
import toast from 'react-hot-toast';

interface CityGateProps {
  // Called after a city is saved to the profile.
  onSaved: () => void;
}

// Blocking, non-dismissable gate shown to any signed-in user who has no city
// yet. Email signup already collects a city, but social sign-in (Google/Apple/
// Phone) skips the profile step — this makes location mandatory for every
// account, which powers the Community "Local" feed and nearby events.
export const CityGate: React.FC<CityGateProps> = ({ onSaved }) => {
  const { user } = useAuth();
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) {
      toast.error('Please select your city.');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({ city }).eq('id', user.id);
      if (error) throw error;
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
          Where are you based?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
          We use your city to show events, groups, and community posts near you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
            >
              <option value="" disabled>Select your city</option>
              {SUPPORTED_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !city}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
