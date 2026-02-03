import { useState, useEffect, useCallback } from 'react';
import { supabase, Topic } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export interface Repost {
  id: string;
  user_id: string;
  original_topic_id: string;
  quote_text: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  original_topic?: Topic;
}

export const useReposts = () => {
  const { user } = useAuth();
  const [userReposts, setUserReposts] = useState<Set<string>>(new Set());
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchUserReposts = useCallback(async () => {
    if (!user) {
      setUserReposts(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reposts')
        .select('original_topic_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserReposts(new Set((data || []).map(r => r.original_topic_id)));
    } catch (error) {
      console.error('Error fetching user reposts:', error);
    }
  }, [user]);

  const fetchRepostCounts = useCallback(async (topicIds: string[]) => {
    if (topicIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('reposts')
        .select('original_topic_id')
        .in('original_topic_id', topicIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      topicIds.forEach(id => {
        counts[id] = 0;
      });

      (data || []).forEach(repost => {
        counts[repost.original_topic_id] = (counts[repost.original_topic_id] || 0) + 1;
      });

      setRepostCounts(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error('Error fetching repost counts:', error);
    }
  }, []);

  const createRepost = useCallback(async (topicId: string, quoteText?: string) => {
    if (!user) {
      toast.error('Please sign in to repost');
      return null;
    }

    if (userReposts.has(topicId) && !quoteText) {
      toast.error('You have already reposted this');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reposts')
        .insert({
          user_id: user.id,
          original_topic_id: topicId,
          quote_text: quoteText || null
        })
        .select()
        .single();

      if (error) throw error;

      setUserReposts(prev => new Set([...prev, topicId]));
      setRepostCounts(prev => ({
        ...prev,
        [topicId]: (prev[topicId] || 0) + 1
      }));

      await supabase.from('activity_feed').insert({
        user_id: user.id,
        activity_type: 'repost',
        target_id: topicId,
        target_type: 'topic',
        metadata: quoteText ? { quote_text: quoteText } : {}
      });

      toast.success(quoteText ? 'Quote posted!' : 'Reposted!');
      return data;
    } catch (error) {
      console.error('Error creating repost:', error);
      toast.error('Failed to repost');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, userReposts]);

  const removeRepost = useCallback(async (topicId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('reposts')
        .delete()
        .eq('user_id', user.id)
        .eq('original_topic_id', topicId)
        .is('quote_text', null);

      if (error) throw error;

      setUserReposts(prev => {
        const newSet = new Set(prev);
        newSet.delete(topicId);
        return newSet;
      });

      setRepostCounts(prev => ({
        ...prev,
        [topicId]: Math.max(0, (prev[topicId] || 0) - 1)
      }));

      toast.success('Repost removed');
      return true;
    } catch (error) {
      console.error('Error removing repost:', error);
      toast.error('Failed to remove repost');
      return false;
    }
  }, [user]);

  const fetchUserRepostFeed = useCallback(async (userId: string): Promise<Repost[]> => {
    try {
      const { data, error } = await supabase
        .from('reposts')
        .select(`
          *,
          users:user_id (
            id,
            name,
            avatar_url
          ),
          topics:original_topic_id (
            *,
            users!topics_author_id_fkey (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(repost => ({
        ...repost,
        user: repost.users,
        original_topic: repost.topics
      }));
    } catch (error) {
      console.error('Error fetching user reposts:', error);
      return [];
    }
  }, []);

  const hasReposted = useCallback((topicId: string) => {
    return userReposts.has(topicId);
  }, [userReposts]);

  const getRepostCount = useCallback((topicId: string) => {
    return repostCounts[topicId] || 0;
  }, [repostCounts]);

  useEffect(() => {
    fetchUserReposts();
  }, [fetchUserReposts]);

  return {
    hasReposted,
    getRepostCount,
    createRepost,
    removeRepost,
    fetchRepostCounts,
    fetchUserRepostFeed,
    loading
  };
};
