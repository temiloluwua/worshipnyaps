import React, { useEffect, useState } from 'react';
import { MessageSquare, Clock, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CreateTopicModal } from '../topics/CreateTopicModal';

interface EventTopicRow {
  id: string;
  title: string;
  moderation_status?: 'pending' | 'approved' | 'rejected';
}

interface EventTopicsSectionProps {
  eventId: string;
  eventTitle?: string;
  onViewTopic?: (topicId: string) => void;
  onRequireAuth?: () => void;
}

// Lists the topics created inside this event and lets ANY event viewer suggest
// a new one. RLS returns approved topics to everyone who can see the event,
// plus pending ones (to the event's viewers, the author, and staff) — so a
// submitted topic shows here immediately, badged "Pending review", while
// staying off the public deck until an admin/moderator approves it.
export const EventTopicsSection: React.FC<EventTopicsSectionProps> = ({ eventId, eventTitle, onViewTopic, onRequireAuth }) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<EventTopicRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Topics from this event</h3>
        </div>
        <button
          type="button"
          onClick={() => (user ? setShowCreate(true) : onRequireAuth?.())}
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Suggest a topic
        </button>
      </div>

      {topics.length > 0 ? (
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
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No topics yet — suggest one for the group to discuss. New topics are reviewed before they go public.</p>
      )}

      {showCreate && (
        <CreateTopicModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          topicType="preselected"
          allowNonAdmin
          eventId={eventId}
          onRequireAuth={onRequireAuth}
          initialValues={{ title: eventTitle ? `From: ${eventTitle}` : '' }}
          onCreated={() => { setShowCreate(false); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
};
