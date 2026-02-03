import { useState, useEffect, useCallback } from 'react';
import { supabase, Topic } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export interface Hashtag {
  id: string;
  name: string;
  usage_count: number;
  created_at: string;
}

export const useHashtags = () => {
  const { user } = useAuth();
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [followedHashtags, setFollowedHashtags] = useState<Hashtag[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchTrendingHashtags = useCallback(async (limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTrendingHashtags(data || []);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
    }
  }, []);

  const fetchFollowedHashtags = useCallback(async () => {
    if (!user) {
      setFollowedHashtags([]);
      setFollowedIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hashtag_follows')
        .select(`
          hashtag_id,
          hashtags (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const hashtags: Hashtag[] = [];
      (data || []).forEach(d => {
        if (d.hashtags && typeof d.hashtags === 'object' && !Array.isArray(d.hashtags)) {
          hashtags.push(d.hashtags as Hashtag);
        }
      });

      setFollowedHashtags(hashtags);
      setFollowedIds(new Set(hashtags.map((h: Hashtag) => h.id)));
    } catch (error) {
      console.error('Error fetching followed hashtags:', error);
    }
  }, [user]);

  const toggleFollowHashtag = useCallback(async (hashtagId: string) => {
    if (!user) {
      toast.error('Please sign in to follow hashtags');
      return false;
    }

    const isCurrentlyFollowing = followedIds.has(hashtagId);

    setFollowedIds(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyFollowing) {
        newSet.delete(hashtagId);
      } else {
        newSet.add(hashtagId);
      }
      return newSet;
    });

    try {
      if (isCurrentlyFollowing) {
        const { error } = await supabase
          .from('hashtag_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('hashtag_id', hashtagId);

        if (error) throw error;
        toast.success('Unfollowed hashtag');
      } else {
        const { error } = await supabase
          .from('hashtag_follows')
          .insert({
            user_id: user.id,
            hashtag_id: hashtagId
          });

        if (error) throw error;
        toast.success('Following hashtag');
      }

      await fetchFollowedHashtags();
      return true;
    } catch (error) {
      console.error('Error toggling hashtag follow:', error);
      setFollowedIds(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyFollowing) {
          newSet.add(hashtagId);
        } else {
          newSet.delete(hashtagId);
        }
        return newSet;
      });
      toast.error('Failed to update');
      return false;
    }
  }, [user, followedIds, fetchFollowedHashtags]);

  const searchHashtags = useCallback(async (query: string): Promise<Hashtag[]> => {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .ilike('name', `${query}%`)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching hashtags:', error);
      return [];
    }
  }, []);

  const getOrCreateHashtag = useCallback(async (name: string): Promise<Hashtag | null> => {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      const { data: existing } = await supabase
        .from('hashtags')
        .select('*')
        .eq('name', normalizedName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('hashtags')
          .update({ usage_count: existing.usage_count + 1 })
          .eq('id', existing.id);

        return { ...existing, usage_count: existing.usage_count + 1 };
      }

      const { data: newHashtag, error } = await supabase
        .from('hashtags')
        .insert({ name: normalizedName, usage_count: 1 })
        .select()
        .single();

      if (error) throw error;
      return newHashtag;
    } catch (error) {
      console.error('Error creating hashtag:', error);
      return null;
    }
  }, []);

  const fetchTopicsByHashtag = useCallback(async (hashtagName: string): Promise<Topic[]> => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          users!topics_author_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .contains('tags', [hashtagName])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching topics by hashtag:', error);
      return [];
    }
  }, []);

  const isFollowing = useCallback((hashtagId: string) => {
    return followedIds.has(hashtagId);
  }, [followedIds]);

  const processHashtagsFromTags = useCallback(async (tags: string[]) => {
    for (const tag of tags) {
      await getOrCreateHashtag(tag);
    }
  }, [getOrCreateHashtag]);

  useEffect(() => {
    fetchTrendingHashtags();
    fetchFollowedHashtags();
  }, [fetchTrendingHashtags, fetchFollowedHashtags]);

  return {
    trendingHashtags,
    followedHashtags,
    loading,
    fetchTrendingHashtags,
    fetchFollowedHashtags,
    toggleFollowHashtag,
    searchHashtags,
    getOrCreateHashtag,
    fetchTopicsByHashtag,
    isFollowing,
    processHashtagsFromTags
  };
};
