import React, { useEffect, useMemo, useState } from 'react';
import { useTopics } from '../../hooks/useTopics';
import toast from 'react-hot-toast';

interface EditTopicModalProps {
  isOpen: boolean;
  topic: any;
  onClose: () => void;
}

export const EditTopicModal: React.FC<EditTopicModalProps> = ({ isOpen, topic, onClose }) => {
  const { updateTopic } = useTopics();

  const initial = useMemo(() => ({
    title: topic?.title || '',
    category: topic?.category || '',
    content: topic?.content || '',
    bibleReference: topic?.bibleReference || '',
    bibleVerse: topic?.bible_verse || '',
    tags: Array.isArray(topic?.tags) ? topic.tags : (typeof topic?.tags === 'string' ? (topic.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean) : []),
    is_pinned: Boolean(topic?.is_pinned || topic?.isPinned),
  }), [topic]);

  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category);
  const [content, setContent] = useState(initial.content);
  const [bibleReference, setBibleReference] = useState(initial.bibleReference);
  const [bibleVerse, setBibleVerse] = useState(initial.bibleVerse);
  const [tagsInput, setTagsInput] = useState(initial.tags.join(', '));
  const [isPinned, setIsPinned] = useState(initial.is_pinned);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initial.title);
    setCategory(initial.category);
    setContent(initial.content);
    setBibleReference(initial.bibleReference);
    setBibleVerse(initial.bibleVerse);
    setTagsInput(initial.tags.join(', '));
    setIsPinned(initial.is_pinned);
  }, [initial]);

  if (!isOpen) return null;

  const onSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!category.trim()) {
      toast.error('Category is required');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    setSaving(true);
    const ok = await updateTopic(topic.id, {
      title: title.trim(),
      category: category.trim(),
      content: content,
      bibleReference: bibleReference.trim() || undefined,
      bible_verse: bibleVerse.trim() || undefined,
      tags,
      is_pinned: isPinned,
    });
    setSaving(false);

    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit Topic</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter topic title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., life-questions, community"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bible Reference (optional)</label>
            <input
              type="text"
              value={bibleReference}
              onChange={(e) => setBibleReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., John 3:16"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bible Verse Text (optional)</label>
            <textarea
              value={bibleVerse}
              onChange={(e) => setBibleVerse(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter the full text of the Bible verse..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write the topic details or context for discussion..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., identity, community, grace"
            />
          </div>

          <div className="flex items-center">
            <input
              id="pin"
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="pin" className="ml-2 text-sm text-gray-700">Pin this topic</label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
