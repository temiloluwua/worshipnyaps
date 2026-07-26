import React, { useEffect, useState } from 'react';
import { Search, X, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TopicPickerProps {
  value: string | null;               // selected topic_id
  onChange: (topicId: string | null, title?: string) => void;
  // Optional label for the currently-selected topic (so we can show it without refetching).
  selectedTitle?: string | null;
}

interface TopicRow { id: string; title: string }

// Search + select a discussion topic to attach to an event (e.g. a Yap that
// centers on a topic). Reused by the event editor and the group event creator.
export const TopicPicker: React.FC<TopicPickerProps> = ({ value, onChange, selectedTitle }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TopicRow[]>([]);
  const [title, setTitle] = useState<string | null>(selectedTitle ?? null);
  const [open, setOpen] = useState(false);

  // Load the selected topic's title if we only have an id.
  useEffect(() => {
    if (value && !title) {
      supabase.from('topics').select('title').eq('id', value).maybeSingle()
        .then(({ data }) => { if (data) setTitle((data as { title: string }).title); });
    }
    if (!value) setTitle(null);
  }, [value, title]);

  useEffect(() => {
    if (!open || !query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, title')
        .ilike('title', `%${query.trim()}%`)
        .is('hidden_at', null)
        .limit(8);
      setResults((data || []) as TopicRow[]);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  if (value && title) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <span className="flex-1 text-sm text-blue-900 dark:text-blue-100 truncate">{title}</span>
        <button type="button" onClick={() => { onChange(null); setTitle(null); setQuery(''); }} className="p-1 text-gray-400 hover:text-red-500">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Search a topic to attach (optional)"
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {results.map(r => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { onChange(r.id, r.title); setTitle(r.title); setOpen(false); setQuery(''); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 truncate"
              >
                {r.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
