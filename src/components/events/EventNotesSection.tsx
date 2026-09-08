import React, { useCallback, useEffect, useState } from 'react';
import { StickyNote, Trash2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CreateTopicModal } from '../topics/CreateTopicModal';
import toast from 'react-hot-toast';

interface EventNote {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: { name?: string; avatar_url?: string } | null;
}

interface EventNotesSectionProps {
  eventId: string;
  eventTitle?: string;
  // Host / co-host / admin can see everyone's notes; admin can curate into a topic.
  canCurate?: boolean;
  isAdmin?: boolean;
}

export const EventNotesSection: React.FC<EventNotesSectionProps> = ({ eventId, eventTitle, canCurate = false, isAdmin = false }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<EventNote[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('event_notes')
      .select('id, content, created_at, author_id, author:users!event_notes_author_id_fkey (name, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (!error) setNotes((data || []) as unknown as EventNote[]);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    const text = content.trim();
    if (!text || !user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('event_notes').insert({ event_id: eventId, author_id: user.id, content: text });
      if (error) throw error;
      setContent('');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save note');
    } finally {
      setBusy(false);
    }
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('event_notes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Combine the notes into a starting point for a new discussion topic.
  const notesDigest = notes.map((n) => `• ${n.content}`).join('\n');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-500" /> Notes
        </h3>
        {isAdmin && notes.length > 0 && (
          <button
            onClick={() => setShowCreateTopic(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" /> Create topic from notes
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Jot takeaways during or after the event.{canCurate ? ' You can see everyone’s notes.' : ' Your notes are private to you and the organizers.'}
      </p>

      {user && (
        <div className="flex items-start gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note…"
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={addNote}
            disabled={busy || !content.trim()}
            className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 shrink-0"
          >
            {busy ? '…' : 'Add'}
          </button>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-xs text-gray-400">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {n.author_id === user?.id ? 'You' : (n.author?.name || 'Someone')}
                  <span className="text-gray-400 font-normal"> · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                </span>
                {n.author_id === user?.id && (
                  <button onClick={() => deleteNote(n.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete note">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{n.content}</p>
            </li>
          ))}
        </ul>
      )}

      {showCreateTopic && (
        <CreateTopicModal
          isOpen={showCreateTopic}
          onClose={() => setShowCreateTopic(false)}
          topicType="preselected"
          initialValues={{
            title: eventTitle ? `From: ${eventTitle}` : '',
            content: notesDigest,
            category: 'community',
          }}
          onCreated={() => { setShowCreateTopic(false); toast.success('Topic created from notes'); }}
        />
      )}
    </div>
  );
};
