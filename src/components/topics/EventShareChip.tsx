import React, { useEffect, useState } from 'react';
import { CalendarDays, Hand, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EventShareChipProps {
  eventId: string;
  needsHelp?: boolean;
  onOpenEvent?: (eventId: string) => void;
}

// Compact card shown on a community post that shares an event. Resolves the
// event's title/date and links into it (and its Help tab when help is needed).
export const EventShareChip: React.FC<EventShareChipProps> = ({ eventId, needsHelp, onOpenEvent }) => {
  const [event, setEvent] = useState<{ title: string; date: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('title, date')
        .eq('id', eventId)
        .maybeSingle();
      if (!cancelled && data) setEvent({ title: data.title, date: data.date });
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  if (!event) return null;

  const when = event.date
    ? new Date(`${event.date}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenEvent?.(eventId); }}
      className="mb-3 flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3 text-left hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-gray-900 dark:text-white">{event.title}</span>
          {needsHelp && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <Hand className="h-3 w-3" /> Needs helpers
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {when ? `${when} · Tap to view` : 'Tap to view the event'}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
    </button>
  );
};
