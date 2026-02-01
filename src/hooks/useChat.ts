import { useState, useEffect, useCallback } from 'react';
import { supabase, ChatMessage } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useChat = (channel: string = 'community') => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
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
        .eq('channel', channel)
        .is('recipient_id', null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  const fetchDirectMessages = useCallback(async (recipientId: string) => {
    if (!user) return [];

    setLoading(true);
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
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendMessage = async (content: string, recipientId?: string) => {
    if (!user || !content.trim()) return false;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId || null,
          channel: recipientId ? 'direct' : channel,
          content: content.trim()
        });

      if (error) throw error;

      if (!recipientId) {
        await fetchMessages();
      }
      return true;
    } catch (error: any) {
      toast.error('Failed to send message');
      return false;
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (error) {
      toast.error('Failed to delete message');
      return false;
    }
  };

  useEffect(() => {
    if (user && channel !== 'direct') {
      fetchMessages();
    }
  }, [user, channel, fetchMessages]);

  useEffect(() => {
    if (!user || channel === 'direct') return;

    const subscription = supabase
      .channel(`chat:${channel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel=eq.${channel}`
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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, channel]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    deleteMessage,
    fetchMessages,
    fetchDirectMessages
  };
};
