import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationSubscription } from '../../hooks/useNotificationSubscription';
import { useTranslation } from 'react-i18next';
import { supabase, ChatMessage, DescriptionTemplate } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MapPin, Calendar, Users, Clock, Share2, ArrowLeft, MessageCircle, Send, Lock, HeartHandshake, Shield, Copy, ExternalLink, Edit3, UserPlus, XCircle, CalendarPlus, CalendarClock, ChevronDown, AlertTriangle, Trash2, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Event as DbEvent } from '../../lib/supabase';
import { EventHelpRequests } from './EventHelpRequests';
import { EventRecapPhotos } from './EventRecapPhotos';
import { EventDescriptionDisplay } from './EventDescriptionTemplate';
import { CheckInButton } from './CheckInButton';
import { AttendeeList } from './AttendeeList';
import { PostEventFriendSuggestions } from './PostEventFriendSuggestions';
import { EditEventModal } from './EditEventModal';
import { TwelveHourTimePicker } from '../ui/TimePicker';
import { RSVPDisclaimerModal } from './RSVPDisclaimerModal';
import { InviteFriendsModal } from './InviteFriendsModal';
import { CoHostManager } from './CoHostManager';
import { EventAnnouncements } from './EventAnnouncements';
import { formatTime12h, formatDateShort } from '../../lib/eventFormat';
import { shareIcs } from '../../lib/icsExport';
import { mapLinkFor } from '../../lib/mapLink';
import { ReportButton } from '../moderation/ReportButton';

interface EventDetailViewProps {
  eventId: string;
  onBack: () => void;
  onViewProfile?: (userId: string) => void;
}

type TabType = 'details' | 'help' | 'chat' | 'organizer' | 'people';
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

export const EventDetailView: React.FC<EventDetailViewProps> = ({ eventId, onBack, onViewProfile }) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  // Events notify by default; attendees can mute a specific event.
  const { subscribed: notifOn, toggle: toggleNotif, saving: notifSaving } =
    useNotificationSubscription('event', eventId);
  const [event, setEvent] = useState<DbEvent | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [displayCapacity, setDisplayCapacity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRsvped, setIsRsvped] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatChannel, setChatChannel] = useState<string | null>(null);
  const [organizerChannel, setOrganizerChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [orgMessages, setOrgMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [messageContent, setMessageContent] = useState('');
  const [orgMessageContent, setOrgMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [canEditEvent, setCanEditEvent] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState(false);
  const [showHostActions, setShowHostActions] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [postponing, setPostponing] = useState(false);
  const [showRsvpDisclaimer, setShowRsvpDisclaimer] = useState(false);
  const [showAdminDeleteConfirm, setShowAdminDeleteConfirm] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orgMessagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const orgRealtimeRef = useRef<RealtimeChannel | null>(null);
  const localTypingActiveRef = useRef(false);
  const localTypingTimeoutRef = useRef<number | null>(null);
  const remoteTypingTimeoutsRef = useRef<Record<string, number>>({});
  const senderCacheRef = useRef<Record<string, ChatMessage['sender']>>({});
  const isHost = Boolean(user && event && user.id === event.host_id);
  const isAdmin = profile?.role === 'admin';
  const canAccessChat = Boolean(chatChannel && (isRsvped || isHost));
  const canAccessOrganizerChat = Boolean(isHost || isOrganizer);
  const safeCapacity = Math.max(displayCapacity || event?.capacity || 1, 1);
  const capacityPercentage = Math.min(100, Math.round((attendeeCount / safeCapacity) * 100));
  const isEventFull = attendeeCount >= safeCapacity;
  const typingUserNames = Object.values(typingUsers);
  const isPrivateEvent = event?.visibility === 'private';

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
    // If we just created this event, jump straight to the Help tab so the
    // host can add help/food requests right away.
    let justCreated = false;
    try {
      const stored = sessionStorage.getItem('wny_event_just_created');
      if (stored === eventId) {
        justCreated = true;
        sessionStorage.removeItem('wny_event_just_created');
      }
    } catch {
      // ignore
    }
    setActiveTab(justCreated ? 'help' : 'details');
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

  useEffect(() => {
    orgMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [orgMessages]);

  useEffect(() => {
    if (!organizerChannel) return;

    const fetchOrgMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`*, sender:users!chat_messages_sender_id_fkey (id, name, avatar_url)`)
          .eq('channel', organizerChannel)
          .is('recipient_id', null)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;
        (data || []).forEach((m) => {
          if (m.sender?.id) senderCacheRef.current[m.sender.id] = m.sender;
        });
        setOrgMessages(data || []);
      } catch (err) {
        console.error('Error fetching organizer messages:', err);
      }
    };
    fetchOrgMessages();

    const sub = supabase
      .channel(`org-chat:${organizerChannel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel=eq.${organizerChannel}`
      }, async (payload) => {
        const senderId = payload.new.sender_id as string;
        let sender = senderCacheRef.current[senderId];
        if (!sender) {
          const { data } = await supabase.from('users').select('id, name, avatar_url').eq('id', senderId).maybeSingle();
          sender = data || undefined;
          if (sender) senderCacheRef.current[senderId] = sender;
        }
        const newMsg: ChatMessage = { ...payload.new as ChatMessage, sender };
        setOrgMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .subscribe();

    orgRealtimeRef.current = sub;
    return () => {
      orgRealtimeRef.current = null;
      sub.unsubscribe();
    };
  }, [organizerChannel]);

  useEffect(() => {
    if (!canAccessOrganizerChat || !eventId) return;
    const orgChannelName = `org:${eventId}`;
    setOrganizerChannel(orgChannelName);
  }, [canAccessOrganizerChat, eventId]);

  const sendOrgMessage = async () => {
    if (!user || !organizerChannel || !orgMessageContent.trim()) return;
    const content = orgMessageContent.trim();
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ sender_id: user.id, channel: organizerChannel, content })
        .select('id, sender_id, recipient_id, channel, content, is_read, created_at')
        .single();

      if (error) throw error;
      if (data) {
        const localSender = {
          id: user.id,
          name: profile?.name || user.user_metadata?.name || user.email || 'You',
          avatar_url: profile?.avatar_url
        };
        senderCacheRef.current[user.id] = localSender;
        const msg: ChatMessage = { ...(data as ChatMessage), sender: localSender };
        setOrgMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      }
      setOrgMessageContent('');
    } catch (err: any) {
      console.error('Error sending organizer message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const fetchEvent = async () => {
    try {
      let data: any = null;
      const { data: directData, error: directError } = await supabase
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
            name,
            avatar_url,
            is_verified
          )
        `)
        .eq('id', eventId)
        .maybeSingle();

      if (directData) {
        data = directData;
      } else {
        // RLS hid the event (likely private + we're not host/cohost/attendee).
        // If the URL has an invite code, ask the SECURITY DEFINER RPC.
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite');
        if (inviteCode) {
          const { data: rpcData } = await supabase
            .rpc('get_event_by_invite_code', { p_event_id: eventId, p_invite_code: inviteCode });
          const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
          if (row) {
            data = row;
            // Note: this row has no joined locations/users — we accept that
            // limitation for the invite landing view; once they RSVP via
            // claim_event_invite the normal join works on subsequent loads.
          }
        }
        if (!data) {
          if (directError && directError.code !== 'PGRST116') throw directError;
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

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

      if (user) {
        const { data: helpAssignment } = await supabase
          .from('event_help_requests')
          .select('id')
          .eq('event_id', eventId)
          .eq('assigned_user_id', user.id)
          .eq('status', 'filled')
          .limit(1);
        setIsOrganizer(Boolean(helpAssignment && helpAssignment.length > 0));

        // Co-host with can_edit also gets host-level edit/cancel/postpone powers.
        const { data: cohostRow } = await supabase
          .from('event_cohosts')
          .select('can_edit')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();
        setCanEditEvent(Boolean(cohostRow?.can_edit));
      } else {
        setCanEditEvent(false);
      }
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
      // For private events visited via an invite link, the RLS INSERT
      // policy blocks the upsert (the user can't "see" the event yet),
      // so we route through the SECURITY DEFINER claim_event_invite RPC
      // which validates the code and inserts the attendee row server-side.
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('invite');
      const isPrivateInvite = event?.visibility === 'private' && inviteCode;

      if (isPrivateInvite) {
        const { error } = await supabase.rpc('claim_event_invite', {
          p_event_id: eventId,
          p_invite_code: inviteCode,
        });
        if (error) throw error;
      } else {
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
      }
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

    const shareText = `Join us for ${event.title} on ${formatDateShort(event.date)} at ${formatTime12h(event.time)}!`;

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

  const cancelEvent = async () => {
    if (!event || !(isHost || canEditEvent)) return;
    setCancellingEvent(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', event.id);
      if (error) throw error;

      // Notify attendees so they see the cancellation in their notifications.
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('user_id')
        .eq('event_id', event.id)
        .in('status', ['registered', 'attended']);
      if (attendees && attendees.length > 0) {
        const notifications = attendees
          .filter(a => a.user_id !== user?.id)
          .map(a => ({
            user_id: a.user_id,
            type: 'event_cancelled',
            title: `Event cancelled: ${event.title}`,
            body: 'The host cancelled this event.',
            payload: { event_id: event.id },
          }));
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      toast.success('Event cancelled');
      setShowCancelConfirm(false);
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel event');
    } finally {
      setCancellingEvent(false);
    }
  };

  const deleteEventAsAdmin = async () => {
    if (!event || !isAdmin) return;
    setAdminDeleting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;
      toast.success('Event deleted');
      setShowAdminDeleteConfirm(false);
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setAdminDeleting(false);
    }
  };

  const postponeEvent = async () => {
    if (!event || !(isHost || canEditEvent)) return;
    if (!postponeDate || !postponeTime) {
      toast.error('Pick a new date and time');
      return;
    }
    setPostponing(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          date: postponeDate,
          time: postponeTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);
      if (error) throw error;

      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('user_id')
        .eq('event_id', event.id)
        .in('status', ['registered', 'attended']);
      if (attendees && attendees.length > 0) {
        const notifications = attendees
          .filter(a => a.user_id !== user?.id)
          .map(a => ({
            user_id: a.user_id,
            type: 'event_postponed',
            title: `Event rescheduled: ${event.title}`,
            body: `New date: ${postponeDate} at ${postponeTime}`,
            payload: { event_id: event.id, new_date: postponeDate, new_time: postponeTime },
          }));
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      toast.success('Event rescheduled — attendees notified');
      setShowPostponeModal(false);
      setPostponeDate('');
      setPostponeTime('');
      await fetchEvent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reschedule event');
    } finally {
      setPostponing(false);
    }
  };

  const addToGoogleCalendar = () => {
    if (!event) return;
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.locations?.address || event.locations?.name || '');
    const dateStr = event.date.replace(/-/g, '');
    const timeStr = (event.time || '00:00').replace(':', '') + '00';
    const start = `${dateStr}T${timeStr}`;
    const endHour = String(parseInt(timeStr.slice(0, 2)) + 2).padStart(2, '0');
    const end = `${dateStr}T${endHour}${timeStr.slice(2)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  const downloadIcal = () => {
    if (!event) return;
    const dateStr = event.date.replace(/-/g, '');
    const timeStr = (event.time || '00:00').replace(':', '') + '00';
    const start = `${dateStr}T${timeStr}`;
    const endHour = String(parseInt(timeStr.slice(0, 2)) + 2).padStart(2, '0');
    const end = `${dateStr}T${endHour}${timeStr.slice(2)}`;
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Worship & Yapps//EN',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${event.locations?.address || event.locations?.name || ''}`,
      `UID:${event.id}@worshipandyapps`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ical], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar file downloaded!');
  };

  const typingLabel = (() => {
    if (typingUserNames.length === 0) return '';
    if (typingUserNames.length === 1) return `${typingUserNames[0]} is typing...`;
    if (typingUserNames.length === 2) return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    return `${typingUserNames[0]}, ${typingUserNames[1]} and ${typingUserNames.length - 2} others are typing...`;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('events.loadingEvent')}</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Lock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('events.privateEvent')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('events.privateEventDesc')}</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('events.goBack')}
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('events.eventNotFound')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('events.eventNotFoundDesc')}</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('events.goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Event Details</h1>
            <div className="flex items-center gap-1">
              {(isHost || canEditEvent) && (
                <div className="relative">
                  <button
                    onClick={() => setShowHostActions(!showHostActions)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center gap-0.5"
                    title="Host actions"
                  >
                    <Edit3 size={18} className="text-gray-700 dark:text-gray-300" />
                    <ChevronDown size={12} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  {showHostActions && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden">
                      <button
                        onClick={() => { setShowEditModal(true); setShowHostActions(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Event
                      </button>
                      <button
                        onClick={() => { setShowInviteModal(true); setShowHostActions(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Friends
                      </button>
                      <button
                        onClick={() => { addToGoogleCalendar(); setShowHostActions(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Add to Calendar
                      </button>
                      <button
                        onClick={() => { downloadIcal(); setShowHostActions(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Download .ics
                      </button>
                      <button
                        onClick={() => {
                          setShowHostActions(false);
                          setPostponeDate(event?.date || '');
                          setPostponeTime(event?.time || '');
                          setShowPostponeModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <CalendarClock className="w-4 h-4" />
                        Postpone Event
                      </button>
                      <div className="border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={() => { setShowHostActions(false); setShowCancelConfirm(true); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel Event
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isHost && (isRsvped || true) && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Invite friends"
                >
                  <UserPlus size={18} className="text-gray-700 dark:text-gray-300" />
                </button>
              )}
              <button
                onClick={shareEvent}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Share event"
              >
                <Share2 size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              {event && (
                <button
                  onClick={() => shareIcs({
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    description: event.description || '',
                    locationName: event.locations?.name,
                    locationAddress: event.locations?.address,
                  })}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Add to calendar"
                >
                  <CalendarPlus size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
              )}
              {event && (
                <ReportButton
                  target={{
                    type: 'event',
                    id: event.id,
                    authorId: event.host_id,
                    preview: `${event.title} — ${event.description?.slice(0, 150) || ''}`,
                    contentSnapshot: { title: event.title, description: event.description, type: event.type },
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 hover:text-red-600 transition-colors"
                />
              )}
              {isAdmin && !isHost && (
                <button
                  onClick={() => setShowAdminDeleteConfirm(true)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-gray-700 dark:text-gray-300 hover:text-red-600 transition-colors"
                  title="Delete event (admin)"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="flex border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative whitespace-nowrap px-2 ${
                activeTab === 'details'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('events.eventDetails')}
              {activeTab === 'details' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative whitespace-nowrap px-2 ${
                activeTab === 'help'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <HeartHandshake size={16} />
                {t('helpRequests.title')}
              </span>
              {activeTab === 'help' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            {canAccessChat && (
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative whitespace-nowrap px-2 ${
                  activeTab === 'chat'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <MessageCircle size={16} />
                  {t('chat.groupChat')}
                </span>
                {activeTab === 'chat' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            )}
            {canAccessOrganizerChat && (
              <button
                onClick={() => setActiveTab('organizer')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative whitespace-nowrap px-2 ${
                  activeTab === 'organizer'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Shield size={16} />
                  {t('chat.organizerChat')}
                </span>
                {activeTab === 'organizer' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            )}
            {(isRsvped || isHost || isOrganizer) && (
              <button
                onClick={() => setActiveTab('people')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative whitespace-nowrap px-2 ${
                  activeTab === 'people'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Users size={16} />
                  People
                </span>
                {activeTab === 'people' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'details' ? (
          <div>
          {(() => {
            const imageUrl = (event as { image_url?: string | null }).image_url;
            const ev = event as { event_type?: string };
            const eventTypeEmoji: Record<string, string> = { bible_study: '📖', church: '⛪', yap: '✨' };
            const locEmoji = ({ home: '🏠', church: '⛪', park: '🌿', cafe: '☕', online: '💻' } as Record<string, string>)[event.location_type || ''] || eventTypeEmoji[ev.event_type || ''] || '✨';
            const fallbackGradient =
              ev.event_type === 'bible_study' ? 'from-indigo-500 via-purple-500 to-blue-600'
              : ev.event_type === 'church'    ? 'from-violet-500 via-fuchsia-500 to-rose-600'
              : 'from-amber-500 via-orange-500 to-rose-600';
            return (
              <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${fallbackGradient} flex items-center justify-center`}>
                    <span className="text-8xl opacity-90 drop-shadow-lg" aria-hidden="true">{locEmoji}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">{event.title}</h1>
                </div>
              </div>
            );
          })()}
          <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              {event.type.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
            {isPrivateEvent && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm font-medium">
                <Lock className="w-3 h-3" />
                {t('events.private')}
              </span>
            )}
            {event.visibility === 'friends_only' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium">
                {t('events.friendsOnly')}
              </span>
            )}
          </div>


          {(() => {
            const tmpl = event.description_template as DescriptionTemplate | null | undefined;
            const hasTemplateContent = tmpl && typeof tmpl === 'object' && (
              tmpl.whatToExpect?.trim() ||
              (Array.isArray(tmpl.whatToBring) && tmpl.whatToBring.length > 0) ||
              tmpl.parkingDirections?.trim() ||
              tmpl.contactInfo?.trim() ||
              tmpl.specialNotes?.trim()
            );
            if (hasTemplateContent) {
              return (
                <div className="mb-6">
                  <EventDescriptionDisplay template={tmpl!} />
                </div>
              );
            }
            if (event.description && event.description !== 'Event details available in the template' && event.description !== 'Event details in template') {
              return <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{event.description}</p>;
            }
            return null;
          })()}

          {/* Event-type badge + structured info */}
          {(event.event_type || event.location_type || event.study_topic || event.session_purpose || event.yap_vibe || event.bring_note) && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  event.event_type === 'yap'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  {event.event_type === 'yap' ? '💬 Yap' : '📖 Bible Study'}
                </span>
                {event.location_type && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {({ home: '🏠 Home', church: '⛪ Church', park: '🌿 Park / Outdoors', cafe: '☕ Café', online: '💻 Online' } as Record<string, string>)[event.location_type] || event.location_type}
                  </span>
                )}
                {event.yap_vibe && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {({ games: '🎲 Games', food: '🍽️ Food / Potluck', sports: '🏅 Sports', music: '🎶 Music / Worship', hanging: '🗣️ Just hanging' } as Record<string, string>)[event.yap_vibe] || event.yap_vibe}
                  </span>
                )}
              </div>

              {event.study_topic && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Studying</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">{event.study_topic}</p>
                </div>
              )}

              {event.session_purpose && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tonight's intention</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{event.session_purpose}</p>
                </div>
              )}

              {event.bring_note && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">Bring</p>
                  <p className="text-sm text-amber-900 dark:text-amber-100">{event.bring_note}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{formatDateShort(event.date)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('events.date')}</div>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{formatTime12h(event.time)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('events.time')}</div>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {event.locations?.name || t('events.locationTBD')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {(() => {
                    const visibility = event.address_visibility || 'public';
                    const canSeeAddress = isHost || isRsvped || visibility === 'public';
                    if (canSeeAddress) {
                      const addr = event.locations?.address;
                      if (!addr) return t('events.addressAfterRSVP');
                      return (
                        <a
                          href={mapLinkFor(addr)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {addr}
                        </a>
                      );
                    }
                    if (visibility === 'general_area') {
                      return 'General area only — exact address is hidden.';
                    }
                    return 'Address shown after you RSVP.';
                  })()}
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-3" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {(isRsvped || isHost || isOrganizer)
                  ? t('events.attending', { count: attendeeCount, capacity: safeCapacity })
                  : (isEventFull
                      ? 'Event is full'
                      : (safeCapacity - attendeeCount <= 2 && attendeeCount > 0)
                        ? 'Almost full'
                        : 'Spots available — RSVP to see who\'s coming')}
              </div>
            </div>
          </div>

          {(isRsvped || isHost || isOrganizer) && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>{t('events.eventCapacity')}</span>
                <span>{t('events.percentFull', { percent: capacityPercentage })}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${capacityPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {isRsvped && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-300 font-medium">{t('events.youreAttending')}</p>
            </div>
          )}

          {isHost && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-800 dark:text-blue-300 font-medium">{t('events.youreHosting')}</p>
            </div>
          )}

          {(isRsvped || isHost) && (
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={toggleNotif}
                disabled={notifSaving}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 touch-manipulation"
                title={notifOn ? 'Notifications on — tap to mute this event' : 'Notifications off — tap to turn on'}
              >
                {notifOn ? <Bell className="w-4 h-4 text-blue-500" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                {notifOn ? 'Notifications on' : 'Notifications off'}
              </button>
              <button
                onClick={addToGoogleCalendar}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-blue-500" />
                Google Calendar
              </button>
              <button
                onClick={downloadIcal}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-green-500" />
                Download .ics
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 text-teal-500" />
                Invite Friends
              </button>
            </div>
          )}

          {!isRsvped && !isHost && (
            <button
              onClick={() => setShowRsvpDisclaimer(true)}
              disabled={isEventFull}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                isEventFull
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEventFull ? t('events.eventFull') : t('events.rsvpNow')}
            </button>
          )}

          {isRsvped && !isHost && (
            <button
              onClick={handleCancelRSVP}
              className="w-full py-4 rounded-lg font-semibold text-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              {t('events.notGoing')}
            </button>
          )}

          <div className="space-y-6 mt-8">
            {/* Open in Maps — only when the viewer is allowed to see the address */}
            {event.locations?.address && (() => {
              const visibility = event.address_visibility || 'public';
              const canSeeAddress = isHost || isRsvped || visibility === 'public';
              return canSeeAddress;
            })() && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <a
                  href={mapLinkFor(event.locations.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <MapPin className="w-4 h-4" />
                  Open in Maps
                </a>
              </div>
            )}

            {/* Invite Code for Private Events */}
            {isPrivateEvent && isHost && event.invite_code && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-3 font-medium">Invite Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-lg font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-700">
                    {event.invite_code}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(event.invite_code || '');
                      toast.success('Copied!');
                    }}
                    className="p-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
                    title="Copy invite code"
                  >
                    <Copy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Hosts */}
            <CoHostManager
              eventId={eventId}
              isHost={isHost}
              eventTitle={event?.title}
              eventDate={event?.date}
              eventTime={event?.time}
              hostName={event?.users?.name}
              hostId={event?.host_id}
              hostAvatarUrl={(event?.users as { avatar_url?: string } | undefined)?.avatar_url}
              hostIsVerified={(event?.users as { is_verified?: boolean } | undefined)?.is_verified}
              onViewProfile={onViewProfile}
            />

            {/* Check-in - only for hosts and organizers */}
            {(isHost || isOrganizer) && (
              <CheckInButton eventId={eventId} isHost={isHost} isRsvped={isRsvped} />
            )}

            {/* Post-event friend suggestions */}
            {event && new Date(event.date) < new Date() && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <PostEventFriendSuggestions eventId={eventId} eventTitle={event.title} />
              </div>
            )}
          </div>
          </div>
          </div>
        ) : activeTab === 'help' ? (
          <>
            <EventHelpRequests eventId={eventId} isHost={isHost} />
            {event && (
              <EventRecapPhotos
                eventId={eventId}
                hostId={event.host_id}
                canUpload={Boolean(isHost || isRsvped)}
              />
            )}
          </>
        ) : activeTab === 'people' ? (
          <div className="p-6">
            <AttendeeList
              eventId={eventId}
              isHost={isHost}
              isRsvped={isRsvped}
              onRsvp={() => setShowRsvpDisclaimer(true)}
            />
          </div>
        ) : activeTab === 'organizer' ? (
          <div className="flex flex-col h-[calc(100vh-120px)]">
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Shield size={12} />
                {t('chat.organizerChat')} - {isHost ? 'Host' : 'Organizer'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {orgMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('chat.noMessages')}</p>
                  <p className="text-sm mt-1">{t('chat.beFirst')}</p>
                </div>
              ) : (
                orgMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${message.sender_id === user?.id ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-lg px-4 py-2`}>
                      {message.sender_id !== user?.id && (
                        <div className="font-semibold text-sm mb-1">{message.sender?.name || 'Unknown'}</div>
                      )}
                      <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                      <div className={`text-xs mt-1 ${message.sender_id === user?.id ? 'text-amber-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={orgMessagesEndRef} />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={orgMessageContent}
                  onChange={(e) => setOrgMessageContent(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendOrgMessage(); } }}
                  placeholder={t('chat.typePlaceholder')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  onClick={sendOrgMessage}
                  disabled={!orgMessageContent.trim() || sending}
                  className="p-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-120px)]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <EventAnnouncements eventId={eventId} canPost={isHost || isOrganizer} />
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('chat.noMessages')}</p>
                  <p className="text-sm mt-1">{t('chat.beFirst')}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${message.sender_id === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-lg px-4 py-2`}>
                      {message.sender_id !== user?.id && (
                        <div className="font-semibold text-sm mb-1">{message.sender?.name || 'Unknown User'}</div>
                      )}
                      <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                      <div className={`text-xs mt-1 ${message.sender_id === user?.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              {typingLabel && (
                <div className="mb-2 flex items-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
                    <span>{typingLabel}</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '240ms' }} />
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
                  placeholder={t('chat.typePlaceholder')}
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

      {showEditModal && event && (
        <EditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { fetchEvent(); }}
        />
      )}

      {showInviteModal && event && (
        <InviteFriendsModal
          eventId={eventId}
          eventTitle={event.title}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showRsvpDisclaimer && event && (
        <RSVPDisclaimerModal
          event={event}
          isOpen={showRsvpDisclaimer}
          onClose={() => setShowRsvpDisclaimer(false)}
          onConfirm={async () => {
            await handleRSVP();
            setShowRsvpDisclaimer(false);
          }}
        />
      )}

      {showHostActions && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowHostActions(false)}
        />
      )}

      {showCancelConfirm && event && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !cancellingEvent && setShowCancelConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cancel this event?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Everyone who RSVP'd will be notified that "{event.title}" was cancelled. This can't be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancellingEvent}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Never mind
              </button>
              <button
                onClick={cancelEvent}
                disabled={cancellingEvent}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancellingEvent ? 'Cancelling...' : 'Cancel event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminDeleteConfirm && event && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !adminDeleting && setShowAdminDeleteConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete this event?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Permanently remove "{event.title}" and all its RSVPs, announcements, and chat. This bypasses the host's normal cancel flow — use only for spam or policy violations.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdminDeleteConfirm(false)}
                disabled={adminDeleting}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Never mind
              </button>
              <button
                onClick={deleteEventAsAdmin}
                disabled={adminDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {adminDeleting ? 'Deleting...' : 'Delete event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostponeModal && event && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !postponing && setShowPostponeModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Postpone event</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Pick a new date and time. Everyone who RSVP'd will be notified.
                </p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New date</label>
                <input
                  type="date"
                  value={postponeDate}
                  onChange={e => setPostponeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New time</label>
                <TwelveHourTimePicker value={postponeTime} onChange={setPostponeTime} />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPostponeModal(false)}
                disabled={postponing}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={postponeEvent}
                disabled={postponing || !postponeDate || !postponeTime}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {postponing ? 'Saving...' : 'Reschedule & notify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
