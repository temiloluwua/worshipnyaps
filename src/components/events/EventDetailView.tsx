import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, ChatMessage } from '../../lib/supabase';
import { MapPin, Calendar, Users, Clock, Share2, ArrowLeft, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Event as DbEvent } from '../../lib/supabase';

interface EventDetailViewProps {
  eventId: string;
  onBack: () => void;
}

type TabType = 'details' | 'chat';

export const EventDetailView: React.FC<EventDetailViewProps> = ({ eventId, onBack }) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<DbEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRsvped, setIsRsvped] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvent();
    if (user) {
      checkRsvpStatus();
      fetchEventConversation();
    }
  }, [eventId, user]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel=eq.${conversationId}`
        },
        async (payload) => {
          const { data } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', payload.new.sender_id)
            .maybeSingle();

          const newMessage: ChatMessage = {
            ...payload.new as ChatMessage,
            sender: data || undefined
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

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
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
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

      if (!error && data) {
        setIsRsvped(true);
      }
    } catch (error) {
      console.error('Error checking RSVP status:', error);
    }
  };

  const fetchEventConversation = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConversationId(data.id);
      }
    } catch (error) {
      console.error('Error fetching event conversation:', error);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

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
        .eq('channel', conversationId)
        .is('recipient_id', null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !conversationId || !messageContent.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          channel: conversationId,
          content: messageContent.trim()
        });

      if (error) throw error;
      setMessageContent('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
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
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered',
        });

      if (error) throw error;
      setIsRsvped(true);
      toast.success('RSVP confirmed!');
    } catch (error: any) {
      console.error('Error RSVPing:', error);
      toast.error(error.message || 'Failed to RSVP');
    }
  };

  const shareEvent = async () => {
    if (!event) return;

    const shareUrl = window.location.href;
    const shareText = `Join us for ${event.title} on ${event.date} at ${event.time}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  const copyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

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
          {isRsvped && conversationId && (
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
                  {event.attendees || 0} / {event.capacity} attending
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Event Capacity</span>
              <span>{Math.round(((event.attendees || 0) / event.capacity) * 100)}% full</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${((event.attendees || 0) / event.capacity) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* RSVP Status */}
          {isRsvped && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-300 font-medium">You're attending this event!</p>
            </div>
          )}

          {/* RSVP Button */}
          {!isRsvped && (
            <button
              onClick={handleRSVP}
              disabled={(event.attendees || 0) >= event.capacity}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                (event.attendees || 0) >= event.capacity
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {(event.attendees || 0) >= event.capacity ? 'Event Full' : 'RSVP Now'}
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
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
