import React, { useEffect, useState } from 'react';
import { CalendarClock, Check, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatDateShort, formatTime12h } from '../../lib/eventFormat';
import { localDateKey } from '../../lib/topicOfDay';

interface SeriesEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
}

type Status = 'registered' | 'waitlisted';

interface EventSeriesPanelProps {
  recurrenceGroupId: string;
  currentEventId: string;
  onOpenEvent?: (eventId: string) => void;
  onRequireAuth?: () => void;
  // Lets the parent refresh its own RSVP state after a series action affects
  // the currently-open event.
  onChanged?: () => void;
}

// Shows the other upcoming occurrences in a recurring series so attendees can
// see the whole run and RSVP to each (or all at once). Each occurrence is its
// own event — RSVP goes through claim_event_seat, same as a normal RSVP.
export const EventSeriesPanel: React.FC<EventSeriesPanelProps> = ({
  recurrenceGroupId, currentEventId, onOpenEvent, onRequireAuth, onChanged,
}) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SeriesEvent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // event id or 'all'

  const load = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, date, time')
      .eq('recurrence_group_id', recurrenceGroupId)
      .eq('status', 'upcoming')
      .gte('date', localDateKey())
      .order('date', { ascending: true });
    const rows = (data || []) as SeriesEvent[];
    setEvents(rows);

    if (user && rows.length > 0) {
      const { data: att } = await supabase
        .from('event_attendees')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('event_id', rows.map((r) => r.id))
        .in('status', ['registered', 'waitlisted']);
      const map: Record<string, Status> = {};
      (att || []).forEach((a: any) => { map[a.event_id] = a.status; });
      setStatuses(map);
    } else {
      setStatuses({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurrenceGroupId, user?.id]);

  const rsvpOne = async (id: string) => {
    if (!user) { onRequireAuth?.(); return; }
    setBusy(id);
    try {
      const { data, error } = await supabase.rpc('claim_event_seat', { p_event_id: id });
      if (error) throw error;
      setStatuses((prev) => ({ ...prev, [id]: data === 'waitlisted' ? 'waitlisted' : 'registered' }));
      toast.success(data === 'waitlisted' ? "You're on the waitlist for that date" : "You're in for that date");
      if (id === currentEventId) onChanged?.();
    } catch (e: any) {
      toast.error(e.message || 'Could not RSVP');
    } finally {
      setBusy(null);
    }
  };

  const rsvpAll = async () => {
    if (!user) { onRequireAuth?.(); return; }
    const pending = events.filter((e) => !statuses[e.id]);
    if (pending.length === 0) return;
    setBusy('all');
    try {
      const next: Record<string, Status> = {};
      for (const e of pending) {
        const { data, error } = await supabase.rpc('claim_event_seat', { p_event_id: e.id });
        if (error) throw error;
        next[e.id] = data === 'waitlisted' ? 'waitlisted' : 'registered';
      }
      setStatuses((prev) => ({ ...prev, ...next }));
      toast.success(`RSVP'd to ${pending.length} ${pending.length === 1 ? 'session' : 'sessions'} 🔁`);
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || 'Could not RSVP to all sessions');
    } finally {
      setBusy(null);
    }
  };

  if (loading || events.length <= 1) return null; // nothing to show for a lone event

  const pendingCount = events.filter((e) => !statuses[e.id]).length;

  return (
    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Part of a series — {events.length} upcoming
          </h3>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={rsvpAll}
            disabled={busy !== null}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {busy === 'all' ? 'RSVPing…' : `RSVP to all (${pendingCount})`}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {events.map((e) => {
          const status = statuses[e.id];
          const isCurrent = e.id === currentEventId;
          return (
            <div key={e.id} className="flex items-center gap-3 py-1.5">
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => !isCurrent && onOpenEvent?.(e.id)}
                  className={`text-sm font-medium truncate text-left ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-blue-600 dark:text-blue-400 hover:underline'}`}
                >
                  {formatDateShort(e.date)}{e.time ? ` · ${formatTime12h(e.time)}` : ''}
                  {isCurrent && <span className="ml-2 text-[11px] font-semibold text-gray-400">This one</span>}
                </button>
              </div>
              {status === 'registered' ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <Check className="w-3.5 h-3.5" /> Going
                </span>
              ) : status === 'waitlisted' ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" /> Waitlist
                </span>
              ) : (
                <button
                  onClick={() => rsvpOne(e.id)}
                  disabled={busy !== null}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
                >
                  {busy === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'RSVP'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
