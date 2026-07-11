import React, { useEffect, useState } from 'react';
import {
  Repeat, MessageSquare, Link2, Copy, Check,
  Send, Facebook, Users, Share2
} from 'lucide-react';
import { Topic, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useReposts } from '../../hooks/useReposts';
import { useConnections } from '../../hooks/useConnections';
import { useDirectMessages } from '../../hooks/useDirectMessages';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

interface ShareModalProps {
  topic: Topic;
  onClose: () => void;
  onStartChat?: (userId: string) => void;
}

interface EventChat {
  conversationId: string;
  eventId: string;
  title: string;
  date: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  topic,
  onClose,
  onStartChat
}) => {
  const { user } = useAuth();
  const { createRepost, hasReposted } = useReposts();
  const { connections } = useConnections();
  const { startConversation, sendMessage } = useDirectMessages();
  const [quoteText, setQuoteText] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [sendingToFriendId, setSendingToFriendId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [eventChats, setEventChats] = useState<EventChat[]>([]);
  const [eventChatsLoading, setEventChatsLoading] = useState(false);
  const [sendingToEventId, setSendingToEventId] = useState<string | null>(null);

  // Inside Capacitor's WebView, window.location.origin is capacitor://localhost
  // — not shareable. Force the production origin so links to X/Facebook/native
  // share actually resolve to a real page.
  const shareOrigin = (() => {
    const origin = window.location.origin;
    if (origin.startsWith('http://localhost') || origin.startsWith('capacitor://')) {
      return 'https://www.worshipnyaps.com';
    }
    return origin;
  })();
  const shareUrl = `${shareOrigin}/topic/${topic.id}`;
  const shareText = `Check out "${topic.title}" on Worship N Yaps`;

  useEffect(() => {
    if (!showEventPicker || !user) return;
    let cancelled = false;
    (async () => {
      setEventChatsLoading(true);
      try {
        const { data: parts, error: partsErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);
        if (partsErr) throw partsErr;
        const convIds = (parts || []).map((p: any) => p.conversation_id).filter(Boolean);
        if (convIds.length === 0) {
          if (!cancelled) setEventChats([]);
          return;
        }

        const { data: convs, error: convsErr } = await supabase
          .from('conversations')
          .select('id, event_id, events!conversations_event_id_fkey(id, title, date)')
          .in('id', convIds)
          .not('event_id', 'is', null);
        if (convsErr) throw convsErr;

        const todayIso = new Date().toISOString().split('T')[0];
        const chats: EventChat[] = (convs || [])
          .map((c: any) => {
            const ev = Array.isArray(c.events) ? c.events[0] : c.events;
            if (!ev) return null;
            return { conversationId: c.id, eventId: ev.id, title: ev.title, date: ev.date };
          })
          .filter((c): c is EventChat => c !== null && c.date >= todayIso)
          .sort((a, b) => a.date.localeCompare(b.date));

        if (!cancelled) setEventChats(chats);
      } catch (err) {
        console.error('Failed to load event chats:', err);
        if (!cancelled) setEventChats([]);
      } finally {
        if (!cancelled) setEventChatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showEventPicker, user]);

  const handleSendToEventChat = async (chat: EventChat) => {
    setSendingToEventId(chat.eventId);
    try {
      const body = quoteText.trim()
        ? `${quoteText.trim()}\n\n📖 "${topic.title}"\n${shareUrl}`
        : `📖 Shared a topic: "${topic.title}"\n${shareUrl}`;
      const ok = await sendMessage(chat.conversationId, body, topic.id);
      if (ok === false) throw new Error('Send failed');
      toast.success(`Shared to ${chat.title}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Could not send');
    } finally {
      setSendingToEventId(null);
    }
  };

  const filteredConnections = (connections || []).filter((c: any) =>
    !friendSearch.trim() ||
    c.connected_user?.name?.toLowerCase().includes(friendSearch.trim().toLowerCase())
  );

  const handleSendToFriend = async (friendId: string) => {
    setSendingToFriendId(friendId);
    try {
      const conv = await startConversation(friendId);
      const convId = typeof conv === 'string' ? conv : (conv as any)?.id;
      if (!convId) throw new Error('No conversation id');
      const body = quoteText.trim()
        ? `${quoteText.trim()}\n\n"${topic.title}"\n${shareUrl}`
        : `Thought you'd like this — "${topic.title}"\n${shareUrl}`;
      const ok = await sendMessage(convId, body);
      if (ok === false) throw new Error('Send failed');
      toast.success('Sent!');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Could not send');
    } finally {
      setSendingToFriendId(null);
    }
  };

  // Community posts live in a different table; tell the repost which source
  // to resolve later so it doesn't hit the topics-only path.
  const sourceType: 'topic' | 'community_post' =
    (topic as any).topic_type === 'community' ? 'community_post' : 'topic';

  const handleRepost = async () => {
    if (hasReposted(topic.id)) {
      toast.error('You have already reposted this');
      return;
    }
    await createRepost(topic.id, undefined, sourceType);
    onClose();
  };

  const handleQuotePost = async () => {
    if (!quoteText.trim()) {
      toast.error('Please add a comment');
      return;
    }
    await createRepost(topic.id, quoteText.trim(), sourceType);
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShareExternal = async (platform: 'x' | 'facebook') => {
    let url = '';

    if (platform === 'x') {
      // x.com is the canonical host now; twitter.com still forwards but x.com
      // is cleaner and avoids any tracker interstitials some browsers add.
      url = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    }

    // On iOS Capacitor, window.open ignores width/height and often opens a
    // blank inline webview. Fall back to the native share sheet when it's
    // available so Facebook / X can be picked from the OS-level picker too.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: topic.title, text: shareText, url: shareUrl });
        return;
      } catch {
        // user cancelled or share failed — fall through to opening the URL
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') {
      // No native share sheet — copy the link as the next best thing so the
      // user can still paste into IG / WhatsApp / Messenger themselves.
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({ title: topic.title, text: shareText, url: shareUrl });
    } catch {
      // silently ignore cancellation
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Share Post">
      <div className="p-6">

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="font-medium text-gray-900 dark:text-white line-clamp-2">
            {topic.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {topic.content}
          </p>
        </div>

        {showFriendPicker && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setShowFriendPicker(false); setFriendSearch(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← Back
              </button>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Send to a friend</h3>
              <div className="w-12" />
            </div>
            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search connections..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="max-h-72 overflow-y-auto -mx-1 px-1">
              {filteredConnections.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                  {connections.length === 0 ? 'Add friends in the Community tab first.' : 'No matching friends.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredConnections.map((conn: any) => (
                    <button
                      key={conn.id}
                      onClick={() => handleSendToFriend(conn.connected_user_id)}
                      disabled={sendingToFriendId === conn.connected_user_id}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden flex items-center justify-center text-white font-medium flex-shrink-0">
                        {conn.connected_user?.avatar_url ? (
                          <img src={conn.connected_user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (conn.connected_user?.name?.charAt(0) || '?')
                        )}
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-white">
                        {conn.connected_user?.name || 'Unknown'}
                      </span>
                      {sendingToFriendId === conn.connected_user_id ? (
                        <span className="text-xs text-gray-500">Sending...</span>
                      ) : (
                        <Send className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showEventPicker && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowEventPicker(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← Back
              </button>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Send to event group chat</h3>
              <div className="w-12" />
            </div>
            <div className="max-h-72 overflow-y-auto -mx-1 px-1">
              {eventChatsLoading ? (
                <p className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              ) : eventChats.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                  No upcoming events you're part of. Host or RSVP to an event first.
                </p>
              ) : (
                <div className="space-y-1">
                  {eventChats.map((chat) => {
                    const formatted = (() => {
                      try {
                        return new Date(chat.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                      } catch {
                        return chat.date;
                      }
                    })();
                    return (
                      <button
                        key={chat.eventId}
                        onClick={() => handleSendToEventChat(chat)}
                        disabled={sendingToEventId === chat.eventId}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex items-center justify-center text-white">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{chat.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatted}</p>
                        </div>
                        {sendingToEventId === chat.eventId ? (
                          <span className="text-xs text-gray-500">Sending...</span>
                        ) : (
                          <Send className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`space-y-3 ${showFriendPicker || showEventPicker ? 'hidden' : ''}`}>
          {!showQuoteInput && (
            <>
              <button
                onClick={() => setShowFriendPicker(true)}
                className="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Send in a message</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Share directly with a friend on the app
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowEventPicker(true)}
                className="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Users className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Send to event group chat</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Share with everyone at your upcoming event
                  </p>
                </div>
              </button>

              <button
                onClick={handleRepost}
                disabled={hasReposted(topic.id)}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg transition-colors ${
                  hasReposted(topic.id)
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                <Repeat className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Repost</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hasReposted(topic.id) ? 'Already reposted' : 'Share to your profile'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowQuoteInput(true)}
                className="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Quote</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add your thoughts and share
                  </p>
                </div>
              </button>
            </>
          )}

          {showQuoteInput && (
            <div className="space-y-3">
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Add your thoughts..."
                rows={3}
                maxLength={280}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowQuoteInput(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {quoteText.length}/280
                  </span>
                  <button
                    onClick={handleQuotePost}
                    disabled={!quoteText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Quote
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showQuoteInput && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-600 my-4"></div>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <div className="text-left flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {copied ? 'Copied!' : 'Copy Link'}
                  </p>
                </div>
                <Copy className="w-4 h-4 text-gray-400" />
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleShareExternal('x')}
                  className="flex items-center justify-center space-x-1.5 p-3 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors touch-manipulation"
                >
                  <span className="font-bold text-lg leading-none">𝕏</span>
                  <span className="font-medium text-sm">Post</span>
                </button>

                <button
                  onClick={() => handleShareExternal('facebook')}
                  className="flex items-center justify-center space-x-1.5 p-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg transition-colors touch-manipulation"
                >
                  <Facebook className="w-5 h-5" />
                  <span className="font-medium text-sm">Facebook</span>
                </button>

                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center space-x-1.5 p-3 bg-gray-800 hover:bg-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
                  title="Instagram, WhatsApp, Messenger, and more"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium text-sm">More</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
