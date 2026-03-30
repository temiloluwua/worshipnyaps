import React, { useEffect, useState } from 'react';
import { UserPlus, AlertTriangle, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface Attendee {
  user_id: string;
  status: string;
  user?: { id: string; name: string; avatar_url?: string };
}

interface Connection {
  connected_user_id: string;
}

interface AttendeeListProps {
  eventId: string;
  isHost: boolean;
}

const FLAG_TYPES = ['behaviour', 'safety', 'attendance', 'follow_up', 'positive', 'other'] as const;
const SEVERITY_LEVELS = ['low', 'medium', 'high'] as const;
const REPORT_CATEGORIES = ['inappropriate_behavior', 'safety_concern', 'harassment', 'spam', 'other'] as const;

export const AttendeeList: React.FC<AttendeeListProps> = ({ eventId, isHost }) => {
  const { user } = useAuth();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFlagModal, setShowFlagModal] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [flagForm, setFlagForm] = useState({
    flag_type: 'behaviour' as typeof FLAG_TYPES[number],
    severity: 'medium' as typeof SEVERITY_LEVELS[number],
    reason: ''
  });
  const [reportForm, setReportForm] = useState({
    category: 'inappropriate_behavior' as typeof REPORT_CATEGORIES[number],
    description: ''
  });

  useEffect(() => {
    fetchAttendees();
    if (user) {
      fetchConnections();
    }
  }, [eventId, user]);

  const fetchAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('user_id, status, user:users!user_id(id, name, avatar_url)')
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (error) throw error;
      setAttendees((data || []) as Attendee[]);
    } catch (err) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', user.id)
        .eq('status', 'connected');

      if (error) throw error;
      setConnections(new Set((data || []).map((c: Connection) => c.connected_user_id)));
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  const handleAddFriend = async (userId: string) => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: userId,
          message: `We met at the event!`,
          event_id: eventId
        });

      if (error) throw error;
      toast.success('Friend request sent!');
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        toast.error('You already sent a request to this person');
      } else {
        toast.error(err.message || 'Failed to send request');
      }
    }
  };

  const handleFlag = async (flaggedUserId: string) => {
    if (!isHost || !user) return;

    try {
      const { error } = await supabase
        .from('event_flags')
        .insert({
          event_id: eventId,
          flagged_user_id: flaggedUserId,
          flagged_by: user.id,
          flag_type: flagForm.flag_type,
          severity: flagForm.severity,
          reason: flagForm.reason.trim()
        });

      if (error) throw error;
      toast.success('Attendee flagged');
      setShowFlagModal(null);
      setFlagForm({ flag_type: 'behaviour', severity: 'medium', reason: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to flag attendee');
    }
  };

  const handleReport = async (reportedUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          report_type: 'user',
          category: reportForm.category,
          description: reportForm.description.trim(),
          related_event_id: eventId
        });

      if (error) throw error;
      toast.success('Report submitted');
      setShowReportModal(null);
      setReportForm({ category: 'inappropriate_behavior', description: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading attendees...</div>;
  }

  return (
    <div className="space-y-4">
      {attendees.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">No attendees yet</p>
      ) : (
        attendees.map((attendee) => {
          const isSelf = user?.id === attendee.user_id;
          const isFriend = connections.has(attendee.user_id);

          return (
            <div
              key={attendee.user_id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3 flex-1">
                {attendee.user?.avatar_url && (
                  <img
                    src={attendee.user.avatar_url}
                    alt={attendee.user?.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {attendee.user?.name}
                    {isSelf && <span className="text-xs ml-2 text-blue-600">you</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isSelf && !isHost && !isFriend && (
                  <button
                    onClick={() => handleAddFriend(attendee.user_id || '')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add Friend
                  </button>
                )}

                {isHost && !isSelf && (
                  <button
                    onClick={() => setShowFlagModal(attendee.user_id || '')}
                    className="px-2 py-1 text-sm text-gray-500 hover:text-orange-600 transition-colors"
                    title="Flag attendee"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}

                {!isHost && !isSelf && (
                  <button
                    onClick={() => setShowReportModal(attendee.user_id || '')}
                    className="px-2 py-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    title="Report user"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {showFlagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Flag Attendee</h3>

            <select
              value={flagForm.flag_type}
              onChange={(e) => setFlagForm(p => ({ ...p, flag_type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {FLAG_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={flagForm.severity}
              onChange={(e) => setFlagForm(p => ({ ...p, severity: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {SEVERITY_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)} Severity
                </option>
              ))}
            </select>

            <textarea
              value={flagForm.reason}
              onChange={(e) => setFlagForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Reason for flagging..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowFlagModal(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFlag(showFlagModal)}
                className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Report User</h3>

            <select
              value={reportForm.category}
              onChange={(e) => setReportForm(p => ({ ...p, category: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {REPORT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            <textarea
              value={reportForm.description}
              onChange={(e) => setReportForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe what happened..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReport(showReportModal)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
