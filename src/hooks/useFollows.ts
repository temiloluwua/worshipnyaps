import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// Asymmetric one-way follow graph. Distinct from useConnections (the mutual
// friend graph). Following someone only grants you their public community
// posts in your feed — no friends_only access, no private event access.
export function useFollows() {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const fetchFollowing = useCallback(async () => {
    if (!user) {
      setFollowingIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', user.id);
    if (error) {
      console.error('Error fetching follows:', error);
      return;
    }
    setFollowingIds(new Set((data || []).map((r: { followed_id: string }) => r.followed_id)));
  }, [user]);

  useEffect(() => { fetchFollowing(); }, [fetchFollowing]);

  const isFollowing = useCallback((userId: string) => followingIds.has(userId), [followingIds]);

  const follow = useCallback(async (userId: string) => {
    if (!user || userId === user.id) return false;
    // Optimistic update so the button flips instantly.
    setFollowingIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, followed_id: userId });
    if (error) {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.error(error.message || 'Could not follow');
      return false;
    }
    return true;
  }, [user]);

  const unfollow = useCallback(async (userId: string) => {
    if (!user) return false;
    setFollowingIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', userId);
    if (error) {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      toast.error(error.message || 'Could not unfollow');
      return false;
    }
    return true;
  }, [user]);

  const fetchFollowerCount = useCallback(async (userId: string) => {
    const { count } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followed_id', userId);
    return count ?? 0;
  }, []);

  const fetchFollowingCount = useCallback(async (userId: string) => {
    const { count } = await supabase
      .from('follows')
      .select('followed_id', { count: 'exact', head: true })
      .eq('follower_id', userId);
    return count ?? 0;
  }, []);

  return {
    followingIds,
    isFollowing,
    follow,
    unfollow,
    fetchFollowing,
    fetchFollowerCount,
    fetchFollowingCount,
  };
}
