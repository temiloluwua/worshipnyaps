import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Book, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, TopicRequest } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AdminTopicReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminTopicReviewPanel: React.FC<AdminTopicReviewPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<TopicRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('topic_requests')
        .select('*, requester:users!topic_requests_requested_by_fkey(name, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching topic requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen]);

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('topic_requests')
        .update({ status: action, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      if (action === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          await supabase.from('topics').insert({
            title: request.title,
            content: request.description || '',
            category: request.category,
            topic_type: 'preselected',
            bible_verse: request.bible_verse || null,
            author_id: request.requested_by,
            tags: [],
            is_pinned: false,
            view_count: 0,
          });
        }
      }

      toast.success(action === 'approved' ? 'Topic approved and published!' : 'Request declined');
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} request`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('adminReview.title')}</h2>
            {requests.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                {requests.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('adminReview.noRequests')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {requests.map((req) => (
                <div key={req.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{req.title}</h3>
                      {req.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{req.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {req.bible_verse && (
                          <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                            <Book className="w-3 h-3" />
                            {req.bible_verse}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">{req.category}</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {t('adminReview.requestedBy')} {(req.requester as any)?.name || 'Unknown'}
                        </span>
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      {t('adminReview.reject')}
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      {t('adminReview.approve')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
