import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type ReactionType = 'love' | 'pray' | 'celebrate' | 'amen' | 'thinking';

export const REACTION_EMOJI: Record<ReactionType, string> = {
  love: '❤️',
  pray: '🙏',
  celebrate: '🎉',
  amen: '✝️',
  thinking: '🤔'
};

interface Reaction {
  id: string;
  user_id: string;
  target_type: 'topic' | 'comment' | 'message';
  target_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

interface ReactionCounts {
  [key: string]: Record<ReactionType, number>;
}

interface UserReactions {
  [key: string]: ReactionType[];
}

export const useReactions = () => {
  const { user } = useAuth();
  const [userReactions, setUserReactions] = useState<UserReactions>({});
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});

  const getTargetKey = (type: string, id: string) => `${type}:${id}`;

  const fetchUserReactions = useCallback(async () => {
    if (!user) {
      setUserReactions({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('target_type, target_id, reaction_type')
        .eq('user_id', user.id);

      if (error) throw error;

      const reactions: UserReactions = {};
      (data || []).forEach(reaction => {
        const key = getTargetKey(reaction.target_type, reaction.target_id);
        if (!reactions[key]) {
          reactions[key] = [];
        }
        reactions[key].push(reaction.reaction_type as ReactionType);
      });

      setUserReactions(reactions);
    } catch (error) {
      console.error('Error fetching user reactions:', error);
    }
  }, [user]);

  const fetchReactionCounts = useCallback(async (type: 'topic' | 'comment' | 'message', ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('target_id, reaction_type')
        .eq('target_type', type)
        .in('target_id', ids);

      if (error) throw error;

      const counts: ReactionCounts = {};
      ids.forEach(id => {
        const key = getTargetKey(type, id);
        counts[key] = { love: 0, pray: 0, celebrate: 0, amen: 0, thinking: 0 };
      });

      (data || []).forEach(reaction => {
        const key = getTargetKey(type, reaction.target_id);
        if (counts[key]) {
          counts[key][reaction.reaction_type as ReactionType]++;
        }
      });

      setReactionCounts(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error('Error fetching reaction counts:', error);
    }
  }, []);

  const toggleReaction = useCallback(async (
    targetType: 'topic' | 'comment' | 'message',
    targetId: string,
    reactionType: ReactionType
  ) => {
    if (!user) return false;

    const key = getTargetKey(targetType, targetId);
    const currentReactions = userReactions[key] || [];
    const hasReaction = currentReactions.includes(reactionType);

    setUserReactions(prev => {
      const newReactions = { ...prev };
      if (hasReaction) {
        newReactions[key] = currentReactions.filter(r => r !== reactionType);
      } else {
        newReactions[key] = [...currentReactions, reactionType];
      }
      return newReactions;
    });

    setReactionCounts(prev => {
      const newCounts = { ...prev };
      if (!newCounts[key]) {
        newCounts[key] = { love: 0, pray: 0, celebrate: 0, amen: 0, thinking: 0 };
      }
      newCounts[key][reactionType] += hasReaction ? -1 : 1;
      return newCounts;
    });

    try {
      if (hasReaction) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .eq('reaction_type', reactionType);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reactions')
          .insert({
            user_id: user.id,
            target_type: targetType,
            target_id: targetId,
            reaction_type: reactionType
          });

        if (error) throw error;

        await supabase.from('activity_feed').insert({
          user_id: user.id,
          activity_type: 'reaction',
          target_id: targetId,
          target_type: targetType,
          metadata: { reaction_type: reactionType }
        });
      }

      return true;
    } catch (error) {
      console.error('Error toggling reaction:', error);
      setUserReactions(prev => {
        const newReactions = { ...prev };
        if (hasReaction) {
          newReactions[key] = [...currentReactions];
        } else {
          newReactions[key] = currentReactions.filter(r => r !== reactionType);
        }
        return newReactions;
      });
      setReactionCounts(prev => {
        const newCounts = { ...prev };
        if (newCounts[key]) {
          newCounts[key][reactionType] += hasReaction ? 1 : -1;
        }
        return newCounts;
      });
      return false;
    }
  }, [user, userReactions]);

  const getUserReactions = useCallback((type: string, id: string): ReactionType[] => {
    return userReactions[getTargetKey(type, id)] || [];
  }, [userReactions]);

  const getReactionCounts = useCallback((type: string, id: string): Record<ReactionType, number> => {
    return reactionCounts[getTargetKey(type, id)] || { love: 0, pray: 0, celebrate: 0, amen: 0, thinking: 0 };
  }, [reactionCounts]);

  const getTotalReactions = useCallback((type: string, id: string): number => {
    const counts = getReactionCounts(type, id);
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }, [getReactionCounts]);

  useEffect(() => {
    fetchUserReactions();
  }, [fetchUserReactions]);

  return {
    getUserReactions,
    getReactionCounts,
    getTotalReactions,
    toggleReaction,
    fetchReactionCounts,
    REACTION_EMOJI
  };
};
