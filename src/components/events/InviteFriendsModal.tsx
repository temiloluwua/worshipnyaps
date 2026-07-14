import React, { useState, useEffect } from 'react';
import { X, Search, UserCheck, Send, Clock, CheckCircle2, Copy, Check, Share2, Users, CalendarClock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useEventInvitations } from '../../hooks/useEventInvitations';
import toast from 'react-hot-toast';

interface Friend {
  id: string;
  name: string;
  avatar_url?: string;
}

interface InviteFriendsModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ eventId, eventTitle, onClose }) => {
  const { user } = useAuth();
  const { sendInvitation, sentInvitations } = useEventInvitations();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Source of invitees: your connections, or the attendees of one of your
  // past events (so you can quickly re-invite the same group).
  const [source, setSource] = useState<'friends' | 'past'>('friends');
  const [pastEvents, setPastEvents] = useState<{ id: string; title: string; date: string }[]>([]);
  const [selectedPastEventId, setSelectedPastEventId] = useState('');
  const [pastAttendees, setPastAttendees] = useState<Friend[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);

  const shareOrigin = (() => {
    const origin = window.location.origin;
    if (origin.startsWith('http://localhost') || origin.startsWith('capacitor://')) {
      return 'https://www.worshipnyaps.com';
    }
    return origin;
  })();
  const eventLink = `${shareOrigin}/event/${eventId}`;
  const shareText = `Join me at "${eventTitle}" on Worship N Yaps`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({ title: eventTitle, text: shareText, url: eventLink });
    } catch {
      // user cancelled — no-op
    }
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingFriends(true);
      try {
        const { data, error } = await supabase
          .from('connections')
          .select(`
            connected_user:users!connections_connected_user_id_fkey (
              id, name, avatar_url
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (error) throw error;
        setFriends((data || []).map((c: any) => c.connected_user).filter(Boolean));
      } catch (err) {
        console.error('Error loading friends:', err);
        toast.error('Failed to load friends');
      } finally {
        setLoadingFriends(false);
      }
    };
    load();
  }, [user]);

  // Load the host's past events the first time they switch to that tab.
  useEffect(() => {
    if (source !== 'past' || !user || pastEvents.length > 0) return;
    (async () => {
      setLoadingPast(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('events')
          .select('id, title, date')
          .eq('host_id', user.id)
          .lt('date', today)
          .neq('id', eventId)
          .order('date', { ascending: false })
          .limit(50);
        if (error) throw error;
        setPastEvents(data || []);
      } catch (err) {
        console.error('Error loading past events:', err);
      } finally {
        setLoadingPast(false);
      }
    })();
  }, [source, user, eventId, pastEvents.length]);

  // Load attendees of the selected past event.
  useEffect(() => {
    if (!selectedPastEventId) { setPastAttendees([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingPast(true);
      try {
        const { data, error } = await supabase
          .from('event_attendees')
          .select('users!user_id(id, name, avatar_url)')
          .eq('event_id', selectedPastEventId)
          .eq('status', 'registered');
        if (error) throw error;
        const people = (data || [])
          .map((r: any) => r.users)
          .filter((u: any) => u && u.id !== user?.id);
        if (!cancelled) setPastAttendees(people);
      } catch (err) {
        console.error('Error loading past attendees:', err);
        if (!cancelled) toast.error('Failed to load attendees');
      } finally {
        if (!cancelled) setLoadingPast(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPastEventId, user]);

  const alreadyInvited = new Set(
    sentInvitations
      .filter(inv => inv.event_id === eventId)
      .map(inv => inv.invitee_id)
  );

  const sourceList = source === 'friends' ? friends : pastAttendees;
  const filtered = sourceList.filter(f =>
    (f.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const listLoading = source === 'friends' ? loadingFriends : loadingPast;

  const handleInvite = async (friendId: string) => {
    setSending(prev => ({ ...prev, [friendId]: true }));
    await sendInvitation(eventId, friendId, message || undefined);
    setSending(prev => ({ ...prev, [friendId]: false }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invite Friends</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[260px]">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors touch-manipulation"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors touch-manipulation"
              title="Instagram, WhatsApp, Messenger, and more"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
          {/* Source toggle: connections vs. a past event's attendees. */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <button
              type="button"
              onClick={() => setSource('friends')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors touch-manipulation ${
                source === 'friends' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Users className="w-4 h-4" /> Friends
            </button>
            <button
              type="button"
              onClick={() => setSource('past')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors touch-manipulation ${
                source === 'past' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <CalendarClock className="w-4 h-4" /> Past event
            </button>
          </div>

          {source === 'past' && (
            <select
              value={selectedPastEventId}
              onChange={(e) => setSelectedPastEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{pastEvents.length ? 'Choose a past event…' : 'No past events you hosted'}</option>
              {pastEvents.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={source === 'friends' ? 'Search friends...' : 'Search attendees...'}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Personal message (optional)</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-6">
              <UserCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {source === 'friends'
                  ? (friends.length === 0 ? 'You have no connections yet' : 'No friends match your search')
                  : (!selectedPastEventId ? 'Pick a past event to see who came' : 'No attendees to show')}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((friend) => {
                const invited = alreadyInvited.has(friend.id);
                const isSending = sending[friend.id];
                return (
                  <li key={friend.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        friend.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{friend.name}</span>
                    {invited ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Invited
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInvite(friend.id)}
                        disabled={isSending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isSending ? (
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        {isSending ? 'Sending...' : 'Invite'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
