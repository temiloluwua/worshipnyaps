import { useState, useEffect } from 'react';
import { supabase, EventInvitation } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import toast from 'react-hot-toast';

export const useEventInvitations = () => {
  const { user, profile } = useAuth();
  const { createNotification } = useNotifications();
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<EventInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInvitations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: received, error: receivedError } = await supabase
        .from('event_invitations')
        .select(`
          *,
          event:events (
            id,
            title,
            type,
            date,
            time,
            description
          ),
          inviter:users!event_invitations_inviter_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;
      setInvitations(received || []);

      const { data: sent, error: sentError } = await supabase
        .from('event_invitations')
        .select(`
          *,
          event:events (
            id,
            title,
            type,
            date,
            time
          ),
          invitee:users!event_invitations_invitee_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;
      setSentInvitations(sent || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (eventId: string, inviteeId: string, message?: string) => {
    if (!user) return false;

    try {
      const { data: existing } = await supabase
        .from('event_invitations')
        .select('id')
        .eq('event_id', eventId)
        .eq('invitee_id', inviteeId)
        .maybeSingle();

      if (existing) {
        toast.error('Already invited to this event');
        return false;
      }

      const { error } = await supabase
        .from('event_invitations')
        .insert({
          event_id: eventId,
          inviter_id: user.id,
          invitee_id: inviteeId,
          message,
          status: 'pending'
        });

      if (error) throw error;

      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .maybeSingle();

      await createNotification(
        inviteeId,
        'event',
        'Event Invitation',
        `${profile?.name || 'Someone'} invited you to ${event?.title || 'an event'}`,
        eventId
      );

      toast.success('Invitation sent!');
      await fetchInvitations();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
      return false;
    }
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const { data: invitation } = await supabase
        .from('event_invitations')
        .select('*, event:events(title)')
        .eq('id', invitationId)
        .maybeSingle();

      const { error } = await supabase
        .from('event_invitations')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      if (accept && invitation) {
        const { error: rsvpError } = await supabase
          .from('event_attendees')
          .upsert({
            event_id: invitation.event_id,
            user_id: user!.id,
            status: 'registered'
          }, { onConflict: 'event_id,user_id' });

        if (rsvpError) console.error('Error adding to attendees:', rsvpError);

        await createNotification(
          invitation.inviter_id,
          'event',
          'Invitation Accepted',
          `${profile?.name || 'Someone'} accepted your invitation to ${invitation.event?.title || 'the event'}`
        );
      }

      toast.success(accept ? 'Invitation accepted!' : 'Invitation declined');
      await fetchInvitations();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond to invitation');
      return false;
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('event_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      toast.success('Invitation cancelled');
      await fetchInvitations();
      return true;
    } catch (error) {
      toast.error('Failed to cancel invitation');
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  return {
    invitations,
    sentInvitations,
    loading,
    fetchInvitations,
    sendInvitation,
    respondToInvitation,
    cancelInvitation
  };
};
