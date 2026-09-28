import React, { useEffect, useMemo } from 'react';
import { X, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { TopicPicker } from '../events/TopicPicker';
import { useDailyTopics } from '../../hooks/useDailyTopics';
import { localDateKey } from '../../lib/topicOfDay';

interface DailyTopicSchedulerProps {
  onClose: () => void;
  onChanged?: () => void; // let the feed re-resolve today's pick after edits
}

const DAYS_AHEAD = 14;

// Admin-only: hand-pick the Topic of the Day for today and upcoming dates.
// Any day left blank falls back to the automatic date-hash pick.
export const DailyTopicScheduler: React.FC<DailyTopicSchedulerProps> = ({ onClose, onChanged }) => {
  const { schedule, loading, fetchSchedule, setDailyTopic, clearDailyTopic } = useDailyTopics();

  const days = useMemo(() => {
    const out: string[] = [];
    const base = new Date();
    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(localDateKey(d));
    }
    return out;
  }, []);

  useEffect(() => {
    fetchSchedule(days[0], days[days.length - 1]);
  }, [fetchSchedule, days]);

  const label = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const assign = async (iso: string, topicId: string | null) => {
    try {
      if (topicId) {
        await setDailyTopic(iso, topicId);
        toast.success('Topic scheduled');
      } else {
        await clearDailyTopic(iso);
        toast.success('Reverted to auto pick');
      }
      await fetchSchedule(days[0], days[days.length - 1]);
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || 'Could not update the schedule');
    }
  };

  const todayKey = localDateKey();

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Schedule the Topic of the Day</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pick a topic for any day. Days left blank auto-pick as usual.
          </p>

          {loading && <p className="text-sm text-gray-400">Loading schedule…</p>}

          {days.map((iso) => (
            <div key={iso} className="flex items-start gap-3">
              <div className="w-24 shrink-0 pt-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label(iso)}</span>
                {iso === todayKey && (
                  <span className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400">Today</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <TopicPicker
                  value={schedule[iso]?.topic_id ?? null}
                  selectedTitle={schedule[iso]?.title}
                  onChange={(topicId) => assign(iso, topicId)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
