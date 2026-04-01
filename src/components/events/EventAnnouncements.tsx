import React, { useState, useEffect } from 'react';
import { Megaphone, Pin, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface Announcement {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author: {
    name: string;
    avatar_url?: string;
  };
}

interface EventAnnouncementsProps {
  eventId: string;
  canPost: boolean;
}

export const EventAnnouncements: React.FC<EventAnnouncementsProps> = ({ eventId, canPost }) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('event_announcements')
        .select(`
          id, content, is_pinned, created_at,
          author:users!event_announcements_author_id_fkey (
            name, avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const sub = supabase
      .channel(`announcements:${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_announcements',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchAnnouncements();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'event_announcements',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [eventId]);

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('event_announcements')
        .insert({
          event_id: eventId,
          author_id: user.id,
          content: content.trim(),
          is_pinned: true,
        });

      if (error) throw error;
      toast.success('Announcement posted!');
      setContent('');
      setShowForm(false);
      await fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('event_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement removed');
    } catch (err: any) {
      toast.error('Failed to remove announcement');
    }
  };

  if (announcements.length === 0 && !canPost) return null;

  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/10 mb-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
          <Megaphone className="w-4 h-4" />
          Announcements
          {announcements.length > 0 && (
            <span className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs px-1.5 py-0.5 rounded-full">
              {announcements.length}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {canPost && !collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowForm(!showForm); }}
              className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
            >
              <Plus className="w-3 h-3" />
              Post
            </button>
          )}
          <span className="text-amber-600 dark:text-amber-400 text-xs">{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {showForm && canPost && (
            <div className="flex flex-col gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write an announcement for all attendees..."
                rows={2}
                className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowForm(false); setContent(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={!content.trim() || submitting}
                  className="text-xs bg-amber-600 text-white px-3 py-1 rounded-md hover:bg-amber-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {announcements.length === 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400 py-1">No announcements yet. Post one to notify all attendees.</p>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-800/50">
                <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{ann.content}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{ann.author?.name}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(ann.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {canPost && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                    title="Remove announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
