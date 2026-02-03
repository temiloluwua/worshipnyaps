import React, { useState } from 'react';
import { X, Plus, Minus, Book } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTopics } from '../../hooks/useTopics';
import toast from 'react-hot-toast';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicType?: 'preselected' | 'community';
}

export const CreateTopicModal: React.FC<CreateTopicModalProps> = ({
  isOpen,
  onClose,
  topicType = 'community',
}) => {
  const { user, profile } = useAuth();
  const { createTopic } = useTopics();
  const [formData, setFormData] = useState({
    title: '',
    category: 'life-questions',
    content: '',
    bibleReference: '',
    tags: [] as string[],
    questions: [''],
  });
  const [newTag, setNewTag] = useState('');

  if (!isOpen) return null;

  const isAdmin = profile?.role === 'admin';
  const canCreatePreselected = topicType === 'preselected' && isAdmin;

  const categories = [
    { value: 'life-questions', label: 'Life Questions' },
    { value: 'bible-study', label: 'Bible Study' },
    { value: 'community', label: 'Community' },
    { value: 'faith-journey', label: 'Faith Journey' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'purpose', label: 'Purpose & Calling' },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, ''],
    }));
  };

  const updateQuestion = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? value : q)),
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to create topics');
      return;
    }

    if (topicType === 'preselected' && !isAdmin) {
      toast.error('Only admins can create preselected topics');
      return;
    }

    const topicData = {
      title: formData.title,
      category: formData.category,
      content: formData.content,
      tags: formData.tags,
      topic_type: topicType,
      bible_verse: topicType === 'preselected' ? formData.bibleReference : undefined,
    };

    const result = await createTopic(topicData);
    if (result) {
      toast.success(
        topicType === 'community' ? 'Post created successfully!' : 'Topic created successfully!'
      );
      onClose();
      setFormData({
        title: '',
        category: 'life-questions',
        content: '',
        bibleReference: '',
        tags: [],
        questions: [''],
      });
    }
  };

  const isCommunityPost = topicType === 'community';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isCommunityPost ? 'Create a Post' : 'Create Discussion Topic'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            <div>
              <label
                htmlFor="topic-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {isCommunityPost ? "What's on your mind?" : 'Topic Title'}
              </label>
              <input
                id="topic-title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder={
                  isCommunityPost
                    ? 'Share your thoughts or ask a question...'
                    : 'e.g., How do we handle comparison in our faith?'
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="topic-category"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Category
              </label>
              <select
                id="topic-category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="topic-content"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {isCommunityPost ? 'Details (Optional)' : 'Description'}
              </label>
              <textarea
                id="topic-content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder={
                  isCommunityPost
                    ? 'Add more details to your post...'
                    : 'Provide context or background for this discussion topic...'
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={isCommunityPost ? 3 : 4}
                required={!isCommunityPost}
              />
            </div>

            {!isCommunityPost && (
              <>
                <div>
                  <label
                    htmlFor="bible-reference"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    <Book className="w-4 h-4 inline mr-1" />
                    Bible Verse
                  </label>
                  <input
                    id="bible-reference"
                    type="text"
                    name="bibleReference"
                    value={formData.bibleReference}
                    onChange={handleInputChange}
                    placeholder="e.g., Galatians 6:4; 2 Corinthians 10:12"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discussion Questions
                  </label>
                  <div className="space-y-3">
                    {formData.questions.map((question, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => updateQuestion(index, e.target.value)}
                          placeholder={`Question ${index + 1}...`}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            aria-label="Remove question"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      aria-label={`Remove ${tag} tag`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={topicType === 'preselected' && !isAdmin}
            >
              {isCommunityPost ? 'Post' : 'Create Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
