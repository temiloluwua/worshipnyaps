import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface Attendee {
  user_id: string;
  user?: { id: string; name: string; avatar_url?: string };
}

interface PostEventFriendSuggestionsProps {
  eventId: string;
  eventTitle: string;
}

export const PostEventFriendSuggestions: React.FC<PostEventFriendSuggestionsProps> = ({
  eventId,
  eventTitle
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingFriendRequest, setSendingFriendRequest] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuggestions();
  }, [eventId, user]);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      const { data: attendees, error: attendeeError } = await supabase
        .from('event_attendees')
        .select('user_id, user:users!user_id(id, name, avatar_url)')
        .eq('event_id', eventId);

      if (attendeeError) throw attendeeError;

      const { data: connections, error: connError } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', user.id)
        .eq('status', 'connected');

      if (connError) throw connError;

      const connectedIds = new Set((connections || []).map((c: any) => c.connected_user_id));

      const filtered = (attendees || [])
        .filter((a: any) => a.user_id !== user.id && !connectedIds.has(a.user_id)) as Attendee[];

      setSuggestions(filtered);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    if (!user) return;

    setSendingFriendRequest(p => new Set([...p, userId]));
    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: userId,
          message: `We met at ${eventTitle}!`,
          event_id: eventId
        });

      if (error) throw error;
      toast.success('Friend request sent!');
      setSuggestions(s => s.filter(x => x.user_id !== userId));
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        toast.error('You already sent a request to this person');
      } else {
        toast.error(err.message || 'Failed to send request');
      }
    } finally {
      setSendingFriendRequest(p => {
        const next = new Set(p);
        next.delete(userId);
        return next;
      });
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No new people to connect with from this event</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">People you met</h3>
      <div className="space-y-2">
        {suggestions.map((attendee) => (
          <div
            key={attendee.user_id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 flex-1">
              {attendee.user?.avatar_url && (
                <img
                  src={attendee.user.avatar_url}
                  alt={attendee.user?.name}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <p className="font-medium text-gray-900 dark:text-white">{attendee.user?.name}</p>
            </div>

            <button
              onClick={() => handleAddFriend(attendee.user_id)}
              disabled={sendingFriendRequest.has(attendee.user_id)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              {sendingFriendRequest.has(attendee.user_id) ? 'Sending...' : 'Add Friend'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
