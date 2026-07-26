import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  created_by: string;
  conversation_id: string | null;
  join_code: string;
  created_at: string;
  my_role?: 'leader' | 'member';
}

export interface GroupMember {
  user_id: string;
  role: 'leader' | 'member';
  joined_at: string;
  user?: { id: string; name: string; avatar_url?: string } | null;
}

export interface GroupAnnouncement {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { name: string; avatar_url?: string } | null;
}

export interface PollOption {
  id: string;
  proposed_date: string;
  proposed_time: string;
  sort_order: number;
  votes: { user_id: string }[];
}

export interface Poll {
  id: string;
  group_id: string;
  question: string;
  status: 'open' | 'closed';
  created_event_id: string | null;
  created_at: string;
  options: PollOption[];
}

export const useGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('role, groups (*)')
        .eq('user_id', user.id);
      if (error) throw error;
      const mine = (data || [])
        .map((row: any) => (row.groups ? { ...row.groups, my_role: row.role } as Group : null))
        .filter(Boolean) as Group[];
      mine.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setGroups(mine);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMyGroups(); }, [fetchMyGroups]);

  const createGroup = useCallback(async (name: string, description?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('create_group', { p_name: name, p_description: description ?? null });
      if (error) throw error;
      toast.success('Group created!');
      await fetchMyGroups();
      return data as string;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create group');
      return null;
    }
  }, [fetchMyGroups]);

  const joinGroup = useCallback(async (groupId: string, joinCode: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('join_group', { p_group_id: groupId, p_join_code: joinCode });
      if (error) throw error;
      toast.success('You joined the group!');
      await fetchMyGroups();
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Could not join group');
      return false;
    }
  }, [fetchMyGroups]);

  const fetchGroup = useCallback(async (groupId: string): Promise<Group | null> => {
    try {
      const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (error) throw error;
      return data as Group;
    } catch (err) {
      console.error('Error fetching group:', err);
      return null;
    }
  }, []);

  const fetchMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, role, joined_at, user:users!group_members_user_id_fkey (id, name, avatar_url)')
        .eq('group_id', groupId);
      if (error) throw error;
      return (data || []) as unknown as GroupMember[];
    } catch (err) {
      console.error('Error fetching members:', err);
      return [];
    }
  }, []);

  const fetchAnnouncements = useCallback(async (groupId: string): Promise<GroupAnnouncement[]> => {
    try {
      const { data, error } = await supabase
        .from('group_announcements')
        .select('*, author:users!group_announcements_author_id_fkey (name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GroupAnnouncement[];
    } catch (err) {
      console.error('Error fetching announcements:', err);
      return [];
    }
  }, []);

  const postAnnouncement = useCallback(async (groupId: string, content: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('post_group_announcement', { p_group_id: groupId, p_content: content });
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post announcement');
      return false;
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
      if (error) throw error;
      toast.success('You left the group');
      await fetchMyGroups();
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to leave group');
      return false;
    }
  }, [user, fetchMyGroups]);

  const fetchPolls = useCallback(async (groupId: string): Promise<Poll[]> => {
    try {
      const { data, error } = await supabase
        .from('event_polls')
        .select('id, group_id, question, status, created_event_id, created_at, options:poll_options (id, proposed_date, proposed_time, sort_order, votes:poll_votes (user_id))')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const polls = (data || []) as unknown as Poll[];
      polls.forEach(p => p.options?.sort((a, b) => a.sort_order - b.sort_order));
      return polls;
    } catch (err) {
      console.error('Error fetching polls:', err);
      return [];
    }
  }, []);

  const createPoll = useCallback(async (groupId: string, question: string, options: { date: string; time: string }[]): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('create_schedule_poll', { p_group_id: groupId, p_question: question, p_options: options });
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

  const closePoll = useCallback(async (optionId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('close_poll_to_event', { p_option_id: optionId });
      if (error) throw error;
      toast.success('Event scheduled!');
      return data as string;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to finalize poll');
      return null;
    }
  }, []);

  const removeMember = useCallback(async (groupId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
      if (error) throw error;
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove member');
      return false;
    }
  }, []);

  return {
    groups,
    loading,
    fetchMyGroups,
    createGroup,
    joinGroup,
    fetchGroup,
    fetchMembers,
    fetchAnnouncements,
    postAnnouncement,
    leaveGroup,
    removeMember,
    fetchPolls,
    createPoll,
    toggleVote,
    closePoll,
  };
};
