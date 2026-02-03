import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Like {
  id: string;
  user_id: string;
  likeable_type: 'topic' | 'comment';
  likeable_id: string;
  created_at: string;
}

interface LikeCount {
  [key: string]: number;
}

export const useLikes = () => {
  const { user } = useAuth();
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<LikeCount>({});
  const [loading, setLoading] = useState(false);

  const getLikeKey = (type: 'topic' | 'comment', id: string) => `${type}:${id}`;

  const fetchUserLikes = useCallback(async () => {
    if (!user) {
      setUserLikes(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('likeable_type, likeable_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const likeSet = new Set(
        (data || []).map(like => getLikeKey(like.likeable_type as 'topic' | 'comment', like.likeable_id))
      );
      setUserLikes(likeSet);
    } catch (error) {
      console.error('Error fetching user likes:', error);
    }
  }, [user]);

  const fetchLikeCounts = useCallback(async (type: 'topic' | 'comment', ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('likeable_id')
        .eq('likeable_type', type)
        .in('likeable_id', ids);

      if (error) throw error;

      const counts: LikeCount = {};
      ids.forEach(id => {
        counts[getLikeKey(type, id)] = 0;
      });

      (data || []).forEach(like => {
        const key = getLikeKey(type, like.likeable_id);
        counts[key] = (counts[key] || 0) + 1;
      });

      setLikeCounts(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error('Error fetching like counts:', error);
    }
  }, []);

  const toggleLike = useCallback(async (type: 'topic' | 'comment', id: string) => {
    if (!user) return false;

    const key = getLikeKey(type, id);
    const isCurrentlyLiked = userLikes.has(key);

    setUserLikes(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyLiked) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });

    setLikeCounts(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + (isCurrentlyLiked ? -1 : 1)
    }));

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('likeable_type', type)
          .eq('likeable_id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            likeable_type: type,
            likeable_id: id
          });

        if (error) throw error;

        await supabase.from('activity_feed').insert({
          user_id: user.id,
          activity_type: 'like',
          target_id: id,
          target_type: type
        });
      }

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      setUserLikes(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
        return newSet;
      });
      setLikeCounts(prev => ({
        ...prev,
        [key]: (prev[key] || 0) + (isCurrentlyLiked ? 1 : -1)
      }));
      return false;
    }
  }, [user, userLikes]);

  const isLiked = useCallback((type: 'topic' | 'comment', id: string) => {
    return userLikes.has(getLikeKey(type, id));
  }, [userLikes]);

  const getLikeCount = useCallback((type: 'topic' | 'comment', id: string) => {
    return likeCounts[getLikeKey(type, id)] || 0;
  }, [likeCounts]);

  useEffect(() => {
    fetchUserLikes();
  }, [fetchUserLikes]);

  return {
    isLiked,
    getLikeCount,
    toggleLike,
    fetchLikeCounts,
    loading
  };
};
