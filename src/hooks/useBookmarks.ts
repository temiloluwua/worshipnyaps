import { useState, useEffect, useCallback } from 'react';
import { supabase, Topic } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

type BookmarkTarget = 'topic' | 'community_post';

export const useBookmarks = () => {
  const { user } = useAuth();
  // Stores ids for both topics and community posts. Ids are UUIDs so collisions
  // across the two tables are not a practical concern.
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
        .select('topic_id, community_post_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const ids = new Set<string>();
      (data || []).forEach((b: any) => {
        if (b.topic_id) ids.add(b.topic_id);
        if (b.community_post_id) ids.add(b.community_post_id);
      });
      setBookmarkedIds(ids);
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
        .select('topic_id, community_post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookmarksError) throw bookmarksError;

      if (!bookmarks || bookmarks.length === 0) {
        setBookmarkedTopics([]);
        return;
      }

      const topicIds = bookmarks.map((b: any) => b.topic_id).filter(Boolean);
      const allIds = new Set<string>();
      bookmarks.forEach((b: any) => {
        if (b.topic_id) allIds.add(b.topic_id);
        if (b.community_post_id) allIds.add(b.community_post_id);
      });

      if (topicIds.length === 0) {
        setBookmarkedTopics([]);
        setBookmarkedIds(allIds);
        return;
      }

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
        .map((id: string) => topics?.find((t: any) => t.id === id))
        .filter((t: any): t is Topic => t !== undefined);

      setBookmarkedTopics(orderedTopics);
      setBookmarkedIds(allIds);
    } catch (error) {
      console.error('Error fetching bookmarked topics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const toggleBookmark = useCallback(async (
    id: string,
    type: BookmarkTarget = 'topic'
  ) => {
    if (!user) {
      toast.error('Please sign in to bookmark');
      return false;
    }

    const isCurrentlyBookmarked = bookmarkedIds.has(id);

    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyBookmarked) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });

    try {
      if (isCurrentlyBookmarked) {
        const column = type === 'topic' ? 'topic_id' : 'community_post_id';
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq(column, id);

        if (error) throw error;
        toast.success('Bookmark removed');
      } else {
        const row: any = { user_id: user.id };
        if (type === 'topic') row.topic_id = id;
        else row.community_post_id = id;

        const { error } = await supabase
          .from('bookmarks')
          .insert(row);

        if (error) throw error;
        toast.success('Saved');
      }

      return true;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyBookmarked) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
        return newSet;
      });
      toast.error('Failed to update bookmark');
      return false;
    }
  }, [user, bookmarkedIds]);

  const isBookmarked = useCallback((id: string) => {
    return bookmarkedIds.has(id);
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
