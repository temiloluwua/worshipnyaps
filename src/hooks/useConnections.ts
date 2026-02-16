import { useState, useEffect } from 'react';
import { supabase, Connection, ConnectionRequest } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import toast from 'react-hot-toast';

export const useConnections = () => {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's connections
  const fetchConnections = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          connected_user:users!connections_connected_user_id_fkey (
            id,
            name,
            avatar_url,
            role
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  // Fetch connection requests
  const fetchConnectionRequests = async () => {
    if (!user) return;

    try {
      // Get incoming requests
      const { data: incoming, error: incomingError } = await supabase
        .from('connection_requests')
        .select(`
          *,
          from_user:users!connection_requests_from_user_id_fkey (
            id,
            name,
            avatar_url,
            role
          )
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (incomingError) throw incomingError;

      // Get outgoing requests
      const { data: outgoing, error: outgoingError } = await supabase
        .from('connection_requests')
        .select(`
          *,
          to_user:users!connection_requests_to_user_id_fkey (
            id,
            name,
            avatar_url,
            role
          )
        `)
        .eq('from_user_id', user.id)
        .eq('status', 'pending');

      if (outgoingError) throw outgoingError;

      setConnectionRequests([...(incoming || []), ...(outgoing || [])]);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    }
  };

  // Send connection request
  const sendConnectionRequest = async (
    toUserId: string,
    message?: string,
    eventId?: string
  ) => {
    if (!user) return false;

    try {
      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${toUserId}),and(user_id.eq.${toUserId},connected_user_id.eq.${user.id})`)
        .single();

      if (existingConnection) {
        toast.error('You are already connected with this person');
        return false;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('connection_requests')
        .select('id')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        toast.error('Connection request already sent');
        return false;
      }

      // Create connection request
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          message,
          event_id: eventId,
          status: 'pending'
        });

      if (error) throw error;

      // Send notification
      await createNotification(
        toUserId,
        'connection_request',
        'New Connection Request',
        `${user.user_metadata?.name || 'Someone'} wants to connect with you`
      );

      toast.success('Connection request sent!');
      await fetchConnectionRequests();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Accept connection request
  const acceptConnectionRequest = async (requestId: string) => {
    if (!user) return false;

    try {
      // Accepting a request should only update status; the DB trigger creates both connection rows.
      const { data: request, error: updateError } = await supabase
        .from('connection_requests')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .select('id, from_user_id')
        .maybeSingle();

      if (updateError) throw updateError;
      if (!request) {
        toast.error('This request is no longer pending');
        return false;
      }

      // Send notification
      if (request.from_user_id) {
        // TODO: Implement notification system
        // await createNotification(
        //   request.from_user_id,
        //   'general',
        //   'Connection Accepted',
        //   'Your connection request was accepted!'
        // );
      }

      toast.success('Connection request accepted!');
      await fetchConnections();
      await fetchConnectionRequests();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Decline connection request
  const declineConnectionRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Connection request declined');
      await fetchConnectionRequests();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Remove connection
  const removeConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Connection removed');
      await fetchConnections();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Block user
  const blockUser = async (userId: string) => {
    if (!user) return false;

    try {
      // Remove existing connection if any
      await supabase
        .from('connections')
        .delete()
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${user.id})`);

      // Add to blocked users
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: user.id,
          blocked_user_id: userId,
          reason: 'Blocked by user'
        });

      if (error) throw error;

      toast.success('User blocked');
      await fetchConnections();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  const isConnected = (userId: string): boolean => {
    return connections.some(c => c.connected_user_id === userId);
  };

  const hasPendingRequest = (userId: string): boolean => {
    return connectionRequests.some(
      r => (r.from_user_id === user?.id && r.to_user_id === userId) ||
           (r.to_user_id === user?.id && r.from_user_id === userId)
    );
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
      fetchConnectionRequests();
    }
  }, [user]);

  return {
    connections,
    connectionRequests,
    loading,
    fetchConnections,
    fetchConnectionRequests,
    sendConnectionRequest,
    acceptConnectionRequest,
    declineConnectionRequest,
    removeConnection,
    blockUser,
    isConnected,
    hasPendingRequest
  };
};
