import React, { useEffect, useState } from 'react';
import { MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EventTopicRow {
  id: string;
  title: string;
  moderation_status?: 'pending' | 'approved' | 'rejected';
}

interface EventTopicsSectionProps {
  eventId: string;
  onViewTopic?: (topicId: string) => void;
  // Bumping this re-fetches (e.g. after a new topic is submitted in-event).
  refreshKey?: number;
}

// Lists the topics created inside this event. RLS returns approved topics to
// everyone who can see the event, plus pending ones (to the event's viewers,
// the author, and staff) — so a submitted topic shows here immediately,
// badged "Pending review", while staying off the public deck until approved.
export const EventTopicsSection: React.FC<EventTopicsSectionProps> = ({ eventId, onViewTopic, refreshKey }) => {
  const [topics, setTopics] = useState<EventTopicRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('topics')
      .select('id, title, moderation_status')
      .eq('event_id', eventId)
      .neq('moderation_status', 'rejected')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setTopics((data || []) as EventTopicRow[]); });
    return () => { cancelled = true; };
  }, [eventId, refreshKey]);

  if (topics.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Topics from this event</h3>
      </div>
      <div className="space-y-2">
        {topics.map((tp) => {
          const pending = tp.moderation_status === 'pending';
          return (
            <button
              key={tp.id}
              type="button"
              onClick={() => onViewTopic?.(tp.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
            >
              <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate">{tp.title}</span>
              {pending && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  <Clock className="w-3 h-3" /> Pending review
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
