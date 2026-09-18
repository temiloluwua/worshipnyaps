import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

// A "which day works?" scheduling poll attached to a community post. Reuses the
// same event_polls / poll_options / poll_votes tables as group scheduling polls
// (see supabase/migrations/20260918000000_community_post_polls.sql).
export interface CommunityPollOption {
  id: string;
  proposed_date: string;
  proposed_time: string;
  sort_order: number;
  votes: { user_id: string }[];
}

export interface CommunityPoll {
  id: string;
  community_post_id: string;
  question: string;
  status: 'open' | 'closed';
  created_by: string;
  created_event_id: string | null;
  created_at: string;
  options: CommunityPollOption[];
}

const SELECT =
  'id, community_post_id, question, status, created_by, created_event_id, created_at, ' +
  'options:poll_options (id, proposed_date, proposed_time, sort_order, votes:poll_votes (user_id))';

export const useCommunityPolls = () => {
  const { user } = useAuth();

  // The poll (if any) for a single community post. Posts have at most one.
  const fetchPoll = useCallback(async (postId: string): Promise<CommunityPoll | null> => {
    try {
      const { data, error } = await supabase
        .from('event_polls')
        .select(SELECT)
        .eq('community_post_id', postId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const poll = (data?.[0] as unknown as CommunityPoll) || null;
      poll?.options?.sort((a, b) => a.sort_order - b.sort_order);
      return poll;
    } catch (err) {
      console.error('Error fetching community poll:', err);
      return null;
    }
  }, []);

  const createPoll = useCallback(async (
    postId: string,
    question: string,
    options: { date: string; time: string }[],
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('create_community_schedule_poll', {
        p_community_post_id: postId,
        p_question: question,
        p_options: options,
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create poll');
      return false;
    }
  }, []);

  const toggleVote = useCallback(async (optionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('toggle_poll_vote', { p_option_id: optionId });
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to vote');
      return false;
    }
  }, []);

  // Author finalizes a winning day → creates the event and registers everyone
  // who voted for it. Returns the new event id.
  const finalizePoll = useCallback(async (optionId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('close_poll_to_event', { p_option_id: optionId });
      if (error) throw error;
      toast.success('Event created — everyone who voted is going!');
      return data as string;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create the event');
      return null;
    }
  }, []);

  return { fetchPoll, createPoll, toggleVote, finalizePoll, userId: user?.id };
};
