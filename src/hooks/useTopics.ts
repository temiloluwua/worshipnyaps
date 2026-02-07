import { useState, useEffect, useCallback } from 'react';
import { supabase, Topic, Comment } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useTopics = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all topics
  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          users!topics_author_id_fkey (
            name
          )
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new topic
  const createTopic = useCallback(async (topicData: {
    title: string;
    category: string;
    content: string;
    tags: string[];
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          ...topicData,
          author_id: user.id,
          view_count: 0,
          is_pinned: false
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Topic created successfully!');
      await fetchTopics();
      return data;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  }, [user, fetchTopics]);

  const incrementViewCount = useCallback(async (topicId: string) => {
    try {
      const { error } = await supabase.rpc('increment_view_count', { topic_id: topicId });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  }, []);

  // Get topic comments
  const getTopicComments = useCallback(async (topicId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users!comments_author_id_fkey (
            name,
            avatar_url
          )
        `)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }, []);

  // Add comment to topic
  const addComment = useCallback(async (topicId: string, content: string, parentId?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          topic_id: topicId,
          author_id: user.id,
          content,
          parent_id: parentId
        })
        .select(`
          *,
          users!comments_author_id_fkey (
            name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      toast.success('Comment added!');
      return data;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  }, [user]);

  // Like/unlike topic (using view_count as a proxy for likes)
  const toggleTopicLike = useCallback(async (topicId: string) => {
    if (!user) return;

    try {
      // In a real implementation, you'd have a separate likes table
      // For now, we'll just increment view count as a simple like system
      await incrementViewCount(topicId);
      
      // Update local state
      setTopics(prev => 
        prev.map(topic => 
          topic.id === topicId 
            ? { ...topic, view_count: topic.view_count + 1 }
            : topic
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [user, incrementViewCount]);

  // Pin/unpin topic (admin only)
  const toggleTopicPin = useCallback(async (topicId: string) => {
    if (!user) return;

    try {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return;

      const { error } = await supabase
        .from('topics')
        .update({ is_pinned: !topic.is_pinned })
        .eq('id', topicId);

      if (error) throw error;

      toast.success(topic.is_pinned ? 'Topic unpinned' : 'Topic pinned');
      await fetchTopics();
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [user, topics, fetchTopics]);

  // Update topic (author or admin)
  const updateTopic = useCallback(async (
    topicId: string,
    updates: Partial<Pick<Topic, 'title' | 'category' | 'content' | 'tags'>> & {
      bibleReference?: string;
      is_pinned?: boolean;
    }
  ) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('topics')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', topicId);

      if (error) throw error;

      toast.success('Topic updated successfully!');
      await fetchTopics();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  }, [user, fetchTopics]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return {
    topics,
    loading,
    fetchTopics,
    createTopic,
    incrementViewCount,
    getTopicComments,
    addComment,
    toggleTopicLike,
    toggleTopicPin,
    updateTopic
  };
};
