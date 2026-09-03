import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export interface PollChoice {
  id: string;
  text: string;
  sort_order: number;
  votes: { user_id: string }[];
}

export interface Poll {
  id: string;
  event_id: string | null;
  group_id: string | null;
  question: string;
  allow_multiple: boolean;
  status: 'open' | 'closed';
  created_by: string;
  created_at: string;
  choices: PollChoice[];
}

export type PollScope = { eventId: string } | { groupId: string };

const SELECT =
  'id, event_id, group_id, question, allow_multiple, status, created_by, created_at, ' +
  'choices:poll_choices (id, text, sort_order, votes:poll_choice_votes (user_id))';

export const usePolls = () => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const fetchPolls = useCallback(async (scope: PollScope): Promise<Poll[]> => {
    try {
      let q = supabase.from('polls').select(SELECT).order('created_at', { ascending: false });
      q = 'eventId' in scope ? q.eq('event_id', scope.eventId) : q.eq('group_id', scope.groupId);
      const { data, error } = await q;
      if (error) throw error;
      const polls = (data || []) as unknown as Poll[];
      polls.forEach((p) => p.choices?.sort((a, b) => a.sort_order - b.sort_order));
      return polls;
    } catch (err) {
      console.error('Error fetching polls:', err);
      return [];
    }
  }, []);

  const createPoll = useCallback(async (
    scope: PollScope,
    question: string,
    choices: string[],
    allowMultiple: boolean,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('create_poll', {
        p_event_id: 'eventId' in scope ? scope.eventId : null,
        p_group_id: 'groupId' in scope ? scope.groupId : null,
        p_question: question,
        p_allow_multiple: allowMultiple,
        p_choices: choices,
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create poll');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  // Optimistic toggle so the UI feels instant; caller refetches to reconcile.
  const toggleVote = useCallback(async (choiceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('toggle_poll_choice_vote', { p_choice_id: choiceId });
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to vote');
      return false;
    }
  }, []);

  const closePoll = useCallback(async (pollId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('close_poll', { p_poll_id: pollId });
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close poll');
      return false;
    }
  }, []);

  return { fetchPolls, createPoll, toggleVote, closePoll, busy, userId: user?.id };
};
