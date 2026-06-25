import React, { useMemo } from 'react';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../hooks/useAuth';
import { formatDateShort, formatTime12h } from '../../lib/eventFormat';

interface NearbyEventsRailProps {
  onOpenEvent?: (eventId: string) => void;
}

export const NearbyEventsRail: React.FC<NearbyEventsRailProps> = ({ onOpenEvent }) => {
  const { events } = useEvents();
  const { profile } = useAuth();

  const nearby = useMemo(() => {
    const myCity = profile?.city?.trim().toLowerCase();
    const now = new Date();
    const upcoming = events.filter((e) => {
      const when = new Date(`${e.date}T${e.time || '00:00'}`);
      return when >= now && !(e as { is_draft?: boolean }).is_draft;
    });
    // Prefer same-city events when we know the viewer's city; otherwise
    // surface anything upcoming the viewer can see.
    const local = myCity
      ? upcoming.filter((e) => e.locations?.address?.toLowerCase().includes(myCity))
      : [];
    const seen = new Set<string>();
    const ordered = [...local, ...upcoming].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    return ordered.slice(0, 8);
  }, [events, profile?.city]);

  if (nearby.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {profile?.city ? `Events in ${profile.city}` : 'Upcoming events'}
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x">
        {nearby.map((event) => (
          <button
            key={event.id}
            onClick={() => onOpenEvent?.(event.id)}
            className="flex-shrink-0 w-56 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all snap-start"
          >
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDateShort(event.date)} · {formatTime12h(event.time)}</span>
            </div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
              {event.title}
            </div>
            {event.locations?.name && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{event.locations.name}</span>
              </div>
            )}
            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1 font-medium">
              View event <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
