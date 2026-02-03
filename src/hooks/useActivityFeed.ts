import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type ActivityType = 'like' | 'comment' | 'repost' | 'follow' | 'reaction' | 'mention' | 'post';

export interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  target_id: string | null;
  target_type: string | null;
  target_user_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  target_user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  topic?: {
    id: string;
    title: string;
  };
}

export const useActivityFeed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [myActivities, setMyActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchFriendActivities = useCallback(async (limit = 20, offset = 0) => {
    if (!user) {
      setActivities([]);
      return;
    }

    setLoading(true);
    try {
      const { data: connections } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const friendIds = (connections || []).map(c => c.connected_user_id);

      if (friendIds.length === 0) {
        const { data, error } = await supabase
          .from('activity_feed')
          .select(`
            *,
            users:user_id (
              id,
              name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        const activitiesWithDetails = await enrichActivities(data || []);

        if (offset === 0) {
          setActivities(activitiesWithDetails);
        } else {
          setActivities(prev => [...prev, ...activitiesWithDetails]);
        }
        setHasMore((data || []).length === limit);
        return;
      }

      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          *,
          users:user_id (
            id,
            name,
            avatar_url
          )
        `)
        .in('user_id', [...friendIds, user.id])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const activitiesWithDetails = await enrichActivities(data || []);

      if (offset === 0) {
        setActivities(activitiesWithDetails);
      } else {
        setActivities(prev => [...prev, ...activitiesWithDetails]);
      }
      setHasMore((data || []).length === limit);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMyNotifications = useCallback(async (limit = 20, offset = 0) => {
    if (!user) {
      setMyActivities([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          *,
          users:user_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('target_user_id', user.id)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const activitiesWithDetails = await enrichActivities(data || []);

      if (offset === 0) {
        setMyActivities(activitiesWithDetails);
      } else {
        setMyActivities(prev => [...prev, ...activitiesWithDetails]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const enrichActivities = async (activities: any[]): Promise<ActivityItem[]> => {
    const topicIds = activities
      .filter(a => a.target_type === 'topic' && a.target_id)
      .map(a => a.target_id);

    let topics: Record<string, { id: string; title: string }> = {};

    if (topicIds.length > 0) {
      const { data: topicData } = await supabase
        .from('topics')
        .select('id, title')
        .in('id', topicIds);

      (topicData || []).forEach(t => {
        topics[t.id] = t;
      });
    }

    return activities.map(activity => ({
      ...activity,
      user: activity.users,
      topic: activity.target_id && topics[activity.target_id] ? topics[activity.target_id] : undefined
    }));
  };

  const createActivity = useCallback(async (
    activityType: ActivityType,
    targetId?: string,
    targetType?: string,
    targetUserId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          target_id: targetId,
          target_type: targetType,
          target_user_id: targetUserId,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      return null;
    }
  }, [user]);

  const getActivityMessage = (activity: ActivityItem): string => {
    const userName = activity.user?.name || 'Someone';

    switch (activity.activity_type) {
      case 'like':
        return `${userName} liked ${activity.topic?.title ? `"${activity.topic.title}"` : 'a post'}`;
      case 'comment':
        return `${userName} commented on ${activity.topic?.title ? `"${activity.topic.title}"` : 'a post'}`;
      case 'repost':
        return `${userName} reposted ${activity.topic?.title ? `"${activity.topic.title}"` : 'a post'}`;
      case 'follow':
        return `${userName} started following you`;
      case 'reaction':
        const emoji = activity.metadata?.reaction_type || '';
        return `${userName} reacted ${emoji} to ${activity.topic?.title ? `"${activity.topic.title}"` : 'a post'}`;
      case 'mention':
        return `${userName} mentioned you in a post`;
      case 'post':
        return `${userName} created a new post`;
      default:
        return `${userName} performed an action`;
    }
  };

  useEffect(() => {
    fetchFriendActivities();
  }, [fetchFriendActivities]);

  return {
    activities,
    myActivities,
    loading,
    hasMore,
    fetchFriendActivities,
    fetchMyNotifications,
    createActivity,
    getActivityMessage
  };
};
