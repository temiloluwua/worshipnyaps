import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, ChatMessage } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MapPin, Calendar, Users, Clock, Share2, ArrowLeft, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Event as DbEvent } from '../../lib/supabase';

interface EventDetailViewProps {
  eventId: string;
  onBack: () => void;
}

type TabType = 'details' | 'chat';
const EVENT_CHAT_NAME_PREFIX = 'event-chat:';
const EVENT_CAPACITY_CACHE_KEY = 'event_capacity_cache_v1';
const TYPING_IDLE_TIMEOUT_MS = 1200;
const REMOTE_TYPING_TIMEOUT_MS = 3500;

const getCachedEventCapacity = (eventId: string) => {
  try {
    const raw = window.localStorage.getItem(EVENT_CAPACITY_CACHE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed[eventId] || 0;
  } catch {
    return 0;
  }
};

const setCachedEventCapacity = (eventId: string, capacity: number) => {
  if (capacity <= 0) return;
  try {
    const raw = window.localStorage.getItem(EVENT_CAPACITY_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const previous = parsed[eventId] || 0;
    if (capacity > previous) {
      parsed[eventId] = capacity;
      window.localStorage.setItem(EVENT_CAPACITY_CACHE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore cache write issues.
  }
};

export const EventDetailView: React.FC<EventDetailViewProps> = ({ eventId, onBack }) => {
  const { user, profile } = useAuth();
  const [event, setEvent] = useState<DbEvent | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [displayCapacity, setDisplayCapacity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRsvped, setIsRsvped] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatChannel, setChatChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const localTypingActiveRef = useRef(false);
  const localTypingTimeoutRef = useRef<number | null>(null);
  const remoteTypingTimeoutsRef = useRef<Record<string, number>>({});
  const senderCacheRef = useRef<Record<string, ChatMessage['sender']>>({});
  const isHost = Boolean(user && event && user.id === event.host_id);
  const canAccessChat = Boolean(chatChannel && (isRsvped || isHost));
  const safeCapacity = Math.max(displayCapacity || event?.capacity || 1, 1);
  const capacityPercentage = Math.min(100, Math.round((attendeeCount / safeCapacity) * 100));
  const isEventFull = attendeeCount >= safeCapacity;
  const typingUserNames = Object.values(typingUsers);

  const clearLocalTypingTimeout = () => {
    if (localTypingTimeoutRef.current !== null) {
      window.clearTimeout(localTypingTimeoutRef.current);
      localTypingTimeoutRef.current = null;
    }
  };

  const clearAllRemoteTypingTimeouts = () => {
    Object.values(remoteTypingTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    remoteTypingTimeoutsRef.current = {};
  };

  const sendTypingSignal = (isTyping: boolean) => {
    const channel = realtimeChannelRef.current;
    if (!channel || !user || !chatChannel) return;

    void channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        name: profile?.name || user.user_metadata?.name || user.email || 'Someone',
        isTyping,
        channel: chatChannel
      }
    });
  };

  const stopTyping = () => {
    clearLocalTypingTimeout();
    if (!localTypingActiveRef.current) return;

    localTypingActiveRef.current = false;
    sendTypingSignal(false);
  };

  const queueTypingStop = () => {
    clearLocalTypingTimeout();
    localTypingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, TYPING_IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    setConversationId(null);
    setChatChannel(null);
    setMessages([]);
    setTypingUsers({});
    senderCacheRef.current = {};
    setAttendeeCount(0);
    setDisplayCapacity(getCachedEventCapacity(eventId));
    setIsRsvped(false);
    setActiveTab('details');
    fetchEvent();
    if (user) {
      checkRsvpStatus();
    }
  }, [eventId, user]);

  useEffect(() => {
    if (!user || !event || (!isRsvped && !isHost)) return;
    fetchEventConversation(event);
  }, [user, event, isRsvped, isHost]);

  useEffect(() => {
    if (chatChannel) {
      fetchMessages();
    }
  }, [chatChannel]);

  useEffect(() => {
    if (activeTab === 'chat' && !canAccessChat) {
      setActiveTab('details');
    }
  }, [activeTab, canAccessChat]);

  useEffect(() => {
    if (!chatChannel) return;

    const clearTypingUser = (typingUserId: string) => {
      const existingTimeout = remoteTypingTimeoutsRef.current[typingUserId];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
        delete remoteTypingTimeoutsRef.current[typingUserId];
      }
      setTypingUsers((prev) => {
        if (!prev[typingUserId]) return prev;
        const next = { ...prev };
        delete next[typingUserId];
        return next;
      });
    };

    const trackTypingUser = (typingUserId: string, name: string) => {
      const existingTimeout = remoteTypingTimeoutsRef.current[typingUserId];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }
      remoteTypingTimeoutsRef.current[typingUserId] = window.setTimeout(() => {
        clearTypingUser(typingUserId);
      }, REMOTE_TYPING_TIMEOUT_MS);

      setTypingUsers((prev) => ({
        ...prev,
        [typingUserId]: name
      }));
    };

    const subscription = supabase
      .channel(`event-chat:${chatChannel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel=eq.${chatChannel}`
        },
        async (payload) => {
          const senderId = payload.new.sender_id as string;
          let sender = senderCacheRef.current[senderId];

          if (!sender) {
            const { data } = await supabase
              .from('users')
              .select('id, name, avatar_url')
              .eq('id', senderId)
              .maybeSingle();

            sender = data || undefined;
            if (sender) {
              senderCacheRef.current[senderId] = sender;
            }
          }

          const newMessage: ChatMessage = {
            ...payload.new as ChatMessage,
            sender
          };
          setMessages((prev) => (
            prev.some((message) => message.id === newMessage.id)
              ? prev
              : [...prev, newMessage]
          ));
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const data = payload as { userId?: string; name?: string; isTyping?: boolean };
        if (!data.userId || data.userId === user?.id) return;

        if (data.isTyping) {
          trackTypingUser(data.userId, data.name || 'Someone');
        } else {
          clearTypingUser(data.userId);
        }
      })
      .subscribe();

    realtimeChannelRef.current = subscription;

    return () => {
      stopTyping();
      realtimeChannelRef.current = null;
      clearAllRemoteTypingTimeouts();
      setTypingUsers({});
      subscription.unsubscribe();
    };
  }, [chatChannel, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          locations (
            name,
            address,
            latitude,
            longitude
          ),
          users!events_host_id_fkey (
            name
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
      setDisplayCapacity((previousCapacity) => {
        const cachedCapacity = getCachedEventCapacity(eventId);
        const normalizedCapacity = Math.max(Number(data.capacity) || 0, 1);
        const stableCapacity = previousCapacity > 0
          ? Math.max(previousCapacity, cachedCapacity, normalizedCapacity)
          : Math.max(cachedCapacity, normalizedCapacity);

        setCachedEventCapacity(eventId, stableCapacity);
        return stableCapacity;
      });
      await fetchAttendeeCount(eventId);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendeeCount = async (targetEventId: string) => {
    try {
      const { count, error } = await supabase
        .from('event_attendees')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', targetEventId)
        .eq('status', 'registered');

      if (error) throw error;
      setAttendeeCount(count || 0);
      setDisplayCapacity((previous) => Math.max(previous, count || 0));
    } catch (error) {
      console.error('Error fetching attendee count:', error);
      setAttendeeCount(0);
    }
  };

  const checkRsvpStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .maybeSingle();

      if (error) throw error;
      setIsRsvped(Boolean(data));
    } catch (error) {
      console.error('Error checking RSVP status:', error);
    }
  };

  const isMissingEventIdColumnError = (error: unknown) => {
    const message = (error as { message?: string })?.message || '';
    return message.includes('event_id') && message.includes('conversations');
  };

  const ensureConversationParticipant = async (targetConversationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: targetConversationId,
        user_id: user.id
      });

    if (error && error.code !== '23505') {
      throw error;
    }
  };

  const fetchEventConversation = async (eventData: DbEvent) => {
    if (!user) return;

    try {
      const conversationName = `${EVENT_CHAT_NAME_PREFIX}${eventId}`;
      let supportsEventIdColumn = true;
      let foundConversationId: string | null = null;

      const { data: eventConversations, error: eventConversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (eventConversationError) {
        if (isMissingEventIdColumnError(eventConversationError)) {
          supportsEventIdColumn = false;
        } else {
          throw eventConversationError;
        }
      } else {
        foundConversationId = eventConversations?.[0]?.id || null;
      }

      if (!foundConversationId) {
        const { data: namedConversations, error: namedConversationError } = await supabase
          .from('conversations')
          .select('id')
          .eq('name', conversationName)
          .order('created_at', { ascending: true })
          .limit(1);

        if (namedConversationError) throw namedConversationError;
        foundConversationId = namedConversations?.[0]?.id || null;
      }

      if (foundConversationId) {
        await ensureConversationParticipant(foundConversationId);
        setConversationId(foundConversationId);
        setChatChannel(foundConversationId);
        return;
      }

      if (eventData.host_id !== user.id && !isRsvped) {
        setConversationId(null);
        setChatChannel(`event:${eventId}`);
        return;
      }

      const conversationPayload: {
        is_group: boolean;
        name: string;
        event_id?: string;
      } = {
        is_group: true,
        name: conversationName
      };

      if (supportsEventIdColumn) {
        conversationPayload.event_id = eventData.id;
      }

      const { data: newConversation, error: createConversationError } = await supabase
        .from('conversations')
        .insert(conversationPayload)
        .select('id')
        .single();

      if (createConversationError) throw createConversationError;

      await ensureConversationParticipant(newConversation.id);
      setConversationId(newConversation.id);
      setChatChannel(newConversation.id);
    } catch (error) {
      console.error('Error fetching event conversation:', error);
      setConversationId(null);
      setChatChannel(`event:${eventId}`);
    }
  };

  const fetchMessages = async () => {
    if (!chatChannel) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users!chat_messages_sender_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('channel', chatChannel)
        .is('recipient_id', null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      (data || []).forEach((message) => {
        if (message.sender?.id) {
          senderCacheRef.current[message.sender.id] = message.sender;
        }
      });
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !chatChannel || !messageContent.trim()) return;

    const content = messageContent.trim();
    stopTyping();
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          channel: chatChannel,
          content
        })
        .select(`
          id,
          sender_id,
          recipient_id,
          channel,
          content,
          is_read,
          created_at
        `)
        .single();

      if (error) throw error;
      if (data) {
        const localSender = {
          id: user.id,
          name: profile?.name || user.user_metadata?.name || user.email || 'You',
          avatar_url: profile?.avatar_url
        };
        senderCacheRef.current[user.id] = localSender;
        const insertedMessage: ChatMessage = {
          ...(data as ChatMessage),
          sender: localSender
        };
        setMessages((prev) => (
          prev.some((message) => message.id === insertedMessage.id)
            ? prev
            : [...prev, insertedMessage]
        ));
      }
      setMessageContent('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setMessageContent(nextValue);

    if (!nextValue.trim()) {
      stopTyping();
      return;
    }

    if (!localTypingActiveRef.current) {
      localTypingActiveRef.current = true;
      sendTypingSignal(true);
    }
    queueTypingStop();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRSVP = async () => {
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_attendees')
        .upsert(
          {
            event_id: eventId,
            user_id: user.id,
            status: 'registered',
          },
          { onConflict: 'event_id,user_id' }
        );

      if (error) throw error;
      setIsRsvped(true);
      await fetchAttendeeCount(eventId);
      if (event) {
        await fetchEventConversation(event);
      }
      toast.success('RSVP confirmed!');
    } catch (error: any) {
      console.error('Error RSVPing:', error);
      toast.error(error.message || 'Failed to RSVP');
    }
  };

  const handleCancelRSVP = async () => {
    if (!user) {
      toast.error('Please sign in to update RSVP');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_attendees')
        .upsert(
          {
            event_id: eventId,
            user_id: user.id,
            status: 'cancelled'
          },
          { onConflict: 'event_id,user_id' }
        );

      if (error) throw error;
      setIsRsvped(false);
      setActiveTab('details');
      await fetchAttendeeCount(eventId);
      toast.success('RSVP updated');
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      toast.error(error.message || 'Failed to update RSVP');
    }
  };

  const shareEvent = async () => {
    if (!event) return;

    const shareUrl = new URL(`/event/${event.id}`, window.location.origin);
    if (event.invite_code) {
      shareUrl.searchParams.set('invite', event.invite_code);
    }

    const shareText = `Join us for ${event.title} on ${event.date} at ${event.time}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl.toString(),
        });
        toast.success('Event shared!');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        await copyLink(shareUrl.toString());
      }
    } else {
      await copyLink(shareUrl.toString());
    }
  };

  const copyLink = async (url: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        return;
      } catch (error) {
        console.error('Clipboard API copy failed:', error);
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (copied) {
        toast.success('Link copied to clipboard!');
      } else {
        toast.error('Could not copy link. Please copy it manually from the address bar.');
      }
    } catch (error) {
      console.error('Legacy copy failed:', error);
      toast.error('Could not copy link. Please copy it manually from the address bar.');
    }
  };

  const typingLabel = (() => {
    if (typingUserNames.length === 0) return '';
    if (typingUserNames.length === 1) return `${typingUserNames[0]} is typing...`;
    if (typingUserNames.length === 2) return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    return `${typingUserNames[0]}, ${typingUserNames[1]} and ${typingUserNames.length - 2} others are typing...`;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">This event may have been removed or the link is invalid.</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Event Details</h1>
            <button
              onClick={shareEvent}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <Share2 size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Tabs */}
          {canAccessChat && (
            <div className="flex border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-3 text-center font-medium transition-colors relative ${
                  activeTab === 'details'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Details
                {activeTab === 'details' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-center font-medium transition-colors relative ${
                  activeTab === 'chat'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageCircle size={18} />
                  Group Chat
                </span>
                {activeTab === 'chat' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === 'details' ? (
          <div className="p-6">
          {/* Event Type Badge */}
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              {event.type.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{event.title}</h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{event.description}</p>

          {/* Event Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{event.date}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Date</div>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{event.time}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time</div>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {event.locations?.name || 'Location TBD'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {event.locations?.address || 'Address provided after RSVP'}
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Hosted by {event.users?.name || 'Host'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {attendeeCount} / {safeCapacity} attending
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Event Capacity</span>
              <span>{capacityPercentage}% full</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${capacityPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* RSVP Status */}
          {isRsvped && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-300 font-medium">You're attending this event!</p>
            </div>
          )}

          {isHost && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-800 dark:text-blue-300 font-medium">You are hosting this event.</p>
            </div>
          )}

          {/* RSVP Button */}
          {!isRsvped && !isHost && (
            <button
              onClick={handleRSVP}
              disabled={isEventFull}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                isEventFull
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEventFull ? 'Event Full' : 'RSVP Now'}
            </button>
          )}

          {isRsvped && !isHost && (
            <button
              onClick={handleCancelRSVP}
              className="w-full py-4 rounded-lg font-semibold text-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Not Going
            </button>
          )}
          </div>
        ) : (
          /* Chat Content */
          <div className="flex flex-col h-[calc(100vh-120px)]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Be the first to send a message!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        message.sender_id === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      } rounded-lg px-4 py-2`}
                    >
                      {message.sender_id !== user?.id && (
                        <div className="font-semibold text-sm mb-1">
                          {message.sender?.name || 'Unknown User'}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          message.sender_id === user?.id
                            ? 'text-blue-200'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              {typingLabel && (
                <div className="mb-2 flex items-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
                    <span>{typingLabel}</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce"
                        style={{ animationDelay: '120ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce"
                        style={{ animationDelay: '240ms' }}
                      />
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageContent}
                  onChange={handleMessageInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageContent.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
