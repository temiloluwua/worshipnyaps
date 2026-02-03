import { useState, useEffect, useCallback } from 'react';
import { supabase, Topic } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

interface Bookmark {
  id: string;
  user_id: string;
  topic_id: string;
  created_at: string;
}

export const useBookmarks = () => {
  const { user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkedTopics, setBookmarkedTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarkedIds(new Set());
      setBookmarkedTopics([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('topic_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setBookmarkedIds(new Set((data || []).map(b => b.topic_id)));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchBookmarkedTopics = useCallback(async () => {
    if (!user) {
      setBookmarkedTopics([]);
      return;
    }

    setLoading(true);
    try {
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('topic_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookmarksError) throw bookmarksError;

      if (!bookmarks || bookmarks.length === 0) {
        setBookmarkedTopics([]);
        return;
      }

      const topicIds = bookmarks.map(b => b.topic_id);

      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select(`
          *,
          users!topics_author_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .in('id', topicIds);

      if (topicsError) throw topicsError;

      const orderedTopics = topicIds
        .map(id => topics?.find(t => t.id === id))
        .filter((t): t is Topic => t !== undefined);

      setBookmarkedTopics(orderedTopics);
    } catch (error) {
      console.error('Error fetching bookmarked topics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const toggleBookmark = useCallback(async (topicId: string) => {
    if (!user) {
      toast.error('Please sign in to bookmark topics');
      return false;
    }

    const isCurrentlyBookmarked = bookmarkedIds.has(topicId);

    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyBookmarked) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });

    try {
      if (isCurrentlyBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('topic_id', topicId);

        if (error) throw error;
        toast.success('Bookmark removed');
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            topic_id: topicId
          });

        if (error) throw error;
        toast.success('Topic bookmarked');
      }

      return true;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyBookmarked) {
          newSet.add(topicId);
        } else {
          newSet.delete(topicId);
        }
        return newSet;
      });
      toast.error('Failed to update bookmark');
      return false;
    }
  }, [user, bookmarkedIds]);

  const isBookmarked = useCallback((topicId: string) => {
    return bookmarkedIds.has(topicId);
  }, [bookmarkedIds]);

  useEffect(() => {
    fetchUserBookmarks();
  }, [fetchUserBookmarks]);

  return {
    isBookmarked,
    toggleBookmark,
    bookmarkedTopics,
    bookmarkedIds,
    fetchBookmarkedTopics,
    loading
  };
};
