import React, { useState, useEffect } from 'react';
import { HeartHandshake, Plus, X, Check, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, EventHelpRequest } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface EventHelpRequestsProps {
  eventId: string;
  isHost: boolean;
}

const REQUEST_TYPES = [
  'prayer', 'worship', 'tech', 'discussion', 'hospitality', 'food', 'setup', 'other'
] as const;

const typeIcons: Record<string, string> = {
  prayer: '🙏',
  worship: '🎵',
  tech: '🖥️',
  discussion: '💬',
  hospitality: '🏠',
  food: '🍕',
  setup: '🔧',
  other: '📋',
};

export const EventHelpRequests: React.FC<EventHelpRequestsProps> = ({ eventId, isHost }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState<EventHelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    request_type: 'other' as typeof REQUEST_TYPES[number],
    title: '',
    description: '',
  });

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_help_requests')
        .select('*, assigned_user:users!event_help_requests_assigned_user_id_fkey(name, avatar_url)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching help requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [eventId]);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.title.trim()) return;

    try {
      const { error } = await supabase
        .from('event_help_requests')
        .insert({
          event_id: eventId,
          request_type: newRequest.request_type,
          title: newRequest.title.trim(),
          description: newRequest.description.trim() || null,
          status: 'open',
        });

      if (error) throw error;
      setNewRequest({ request_type: 'other', title: '', description: '' });
      setShowAddForm(false);
      await fetchRequests();
      toast.success('Help request added!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add request');
    }
  };

  const handleVolunteer = async (requestId: string) => {
    if (!user) {
      toast.error('Please sign in to volunteer');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_help_requests')
        .update({ assigned_user_id: user.id, status: 'filled' })
        .eq('id', requestId)
        .eq('status', 'open');

      if (error) throw error;
      await fetchRequests();
      toast.success('Thanks for volunteering!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to volunteer');
    }
  };

  const handleRemoveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('event_help_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      await fetchRequests();
      toast.success('Request removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove request');
    }
  };

  const openCount = requests.filter(r => r.status === 'open').length;
  const filledCount = requests.filter(r => r.status === 'filled').length;

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('helpRequests.title')}
          </h3>
        </div>
        {requests.length > 0 && (
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              {filledCount} {t('helpRequests.filled')}
            </span>
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
              {openCount} {t('helpRequests.open')}
            </span>
          </div>
        )}
      </div>

      {requests.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <HeartHandshake className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {t('helpRequests.noRequests')}
          </p>
          {isHost && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              {t('helpRequests.addRequest')}
            </button>
          )}
        </div>
      )}

      <div className="space-y-3 mb-4">
        {requests.map((req) => (
          <div
            key={req.id}
            className={`border rounded-xl p-4 transition-colors ${
              req.status === 'filled'
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-xl" role="img" aria-label={req.request_type}>
                  {typeIcons[req.request_type] || '📋'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {req.title}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {t(`helpRequests.types.${req.request_type}` as any)}
                    </span>
                  </div>
                  {req.description && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{req.description}</p>
                  )}
                  {req.status === 'filled' && req.assigned_user && (
                    <div className="flex items-center gap-1 mt-2 text-green-700 dark:text-green-300 text-xs">
                      <Check className="w-3 h-3" />
                      <span>{(req.assigned_user as any).name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {req.status === 'open' && user && req.assigned_user_id !== user.id && (
                  <button
                    onClick={() => handleVolunteer(req.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                  >
                    {t('helpRequests.volunteer')}
                  </button>
                )}
                {req.status === 'filled' && req.assigned_user_id === user?.id && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {t('helpRequests.volunteered')}
                  </span>
                )}
                {isHost && (
                  <button
                    onClick={() => handleRemoveRequest(req.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isHost && requests.length > 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors text-sm flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {t('helpRequests.addRequest')}
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddRequest} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">{t('helpRequests.addRequest')}</h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <select
              value={newRequest.request_type}
              onChange={(e) => setNewRequest(prev => ({ ...prev, request_type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeIcons[type]} {t(`helpRequests.types.${type}` as any)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newRequest.title}
              onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('helpRequests.requestTitle')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              required
            />
            <textarea
              value={newRequest.description}
              onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('helpRequests.requestDescription')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
            />
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {t('helpRequests.addRequest')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
