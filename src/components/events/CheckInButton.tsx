import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface CheckIn {
  id: string;
  user_id: string;
  checked_in_at: string;
  user?: { name: string; avatar_url?: string };
}

interface CheckInButtonProps {
  eventId: string;
  isHost: boolean;
  isRsvped: boolean;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  eventId,
  isHost,
  isRsvped
}) => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckIns();
  }, [eventId]);

  const fetchCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from('event_checkins')
        .select('*, user:users!event_checkins_user_id_fkey(name, avatar_url)')
        .eq('event_id', eventId)
        .is('checked_out_at', null)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;

      setCheckIns((data || []) as CheckIn[]);

      if (user) {
        const userCheckIn = (data || []).find(c => c.user_id === user.id);
        setHasCheckedIn(!!userCheckIn);
        if (userCheckIn) {
          setCheckInTime(userCheckIn.checked_in_at);
        }
      }
    } catch (err) {
      console.error('Error fetching check-ins:', err);
    }
  };

  const handleCheckIn = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_checkins')
        .insert({
          event_id: eventId,
          user_id: user.id,
          check_in_method: 'self'
        });

      if (error) throw error;
      setHasCheckedIn(true);
      await fetchCheckIns();
      toast.success('You have checked in!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  if (isHost) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          Checked In ({checkIns.length})
        </h3>
        <div className="space-y-2">
          {checkIns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No one has checked in yet</p>
          ) : (
            checkIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {checkIn.user?.avatar_url && (
                    <img
                      src={checkIn.user.avatar_url}
                      alt={checkIn.user?.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {checkIn.user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(checkIn.checked_in_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (!isRsvped) {
    return null;
  }

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      {hasCheckedIn ? (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <p className="font-medium">Checked In ✓</p>
            {checkInTime && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {new Date(checkInTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={handleCheckIn}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? 'Checking in...' : 'Check In'}
        </button>
      )}
    </div>
  );
};
