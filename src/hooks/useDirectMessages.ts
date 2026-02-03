import { useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  last_message?: DirectMessage;
  unread_count: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  joined_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  shared_topic_id?: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  shared_topic?: {
    id: string;
    title: string;
  };
}

export const useDirectMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      return;
    }

    setLoading(true);
    try {
      const { data: participantData, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      const conversationsWithDetails: Conversation[] = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select(`
              *,
              users:user_id (
                id,
                name,
                avatar_url
              )
            `)
            .eq('conversation_id', conv.id);

          const { data: lastMessage } = await supabase
            .from('direct_messages')
            .select(`
              *,
              sender:sender_id (
                id,
                name,
                avatar_url
              )
            `)
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const myParticipant = participants?.find(p => p.user_id === user.id);
          const { count } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .gt('created_at', myParticipant?.last_read_at || '1970-01-01');

          return {
            ...conv,
            participants: (participants || []).map(p => ({
              ...p,
              user: p.users
            })),
            last_message: lastMessage ? {
              ...lastMessage,
              sender: lastMessage.sender
            } : undefined,
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithDetails);
      setTotalUnread(conversationsWithDetails.reduce((sum, c) => sum + c.unread_count, 0));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            name,
            avatar_url
          ),
          shared_topic:shared_topic_id (
            id,
            title
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []).map(m => ({
        ...m,
        sender: m.sender,
        shared_topic: m.shared_topic
      })));

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    sharedTopicId?: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          shared_topic_id: sharedTopicId
        })
        .select(`
          *,
          sender:sender_id (
            id,
            name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const newMessage = {
        ...data,
        sender: data.sender
      };

      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }
  }, [user]);

  const startConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;

    try {
      const { data: convId, error } = await supabase
        .rpc('get_or_create_dm_conversation', { other_user_id: otherUserId });

      if (error) throw error;

      await fetchConversations();

      const conversation = conversations.find(c => c.id === convId) || {
        id: convId,
        is_group: false,
        name: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        participants: [],
        unread_count: 0
      };

      setActiveConversation(conversation);
      return convId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
      return null;
    }
  }, [user, conversations, fetchConversations]);

  const createGroupConversation = useCallback(async (
    name: string,
    participantIds: string[]
  ) => {
    if (!user) return null;

    try {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({ is_group: true, name })
        .select()
        .single();

      if (convError) throw convError;

      const allParticipants = [user.id, ...participantIds.filter(id => id !== user.id)];
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(
          allParticipants.map(userId => ({
            conversation_id: conv.id,
            user_id: userId
          }))
        );

      if (partError) throw partError;

      await fetchConversations();
      toast.success('Group created');
      return conv.id;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
      return null;
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user || !activeConversation) return;

    const channel = supabase
      .channel(`dm:${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from('direct_messages')
            .select(`
              *,
              sender:sender_id (
                id,
                name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, { ...newMessage, sender: newMessage.sender }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversation]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    totalUnread,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startConversation,
    createGroupConversation
  };
};
