import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadErrorToastShownRef = useRef(false);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Send browser notification
  const sendBrowserNotification = (title: string, message: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      const unread = (data || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
      loadErrorToastShownRef.current = false;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (!loadErrorToastShownRef.current) {
        toast.error('Failed to load notifications');
        loadErrorToastShownRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Create notification
  const createNotification = async (
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    eventId?: string
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          event_id: eventId,
          is_read: false
        });

      if (error) throw error;

      // Send browser notification if it's for the current user
      if (userId === user?.id) {
        sendBrowserNotification(title, message);
      }

      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  };

  // Send volunteer opportunity notification
  const sendVolunteerOpportunityNotification = async (
    eventTitle: string,
    roleNeeded: string,
    eventId: string,
    targetUserIds?: string[]
  ) => {
    try {
      const title = `${roleNeeded} Needed`;
      const message = `${eventTitle} needs a ${roleNeeded.toLowerCase()}. Can you help?`;

      if (targetUserIds && targetUserIds.length > 0) {
        // Send to specific users
        const notifications = targetUserIds.map(userId => ({
          user_id: userId,
          type: 'volunteer_opportunity' as const,
          title,
          message,
          event_id: eventId,
          is_read: false
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      } else {
        // Send to all users with volunteer roles
        const { data: volunteers, error: volunteerError } = await supabase
          .from('volunteer_roles')
          .select('user_id')
          .eq('is_active', true);

        if (volunteerError) throw volunteerError;

        if (volunteers && volunteers.length > 0) {
          const notifications = volunteers.map(volunteer => ({
            user_id: volunteer.user_id,
            type: 'volunteer_opportunity' as const,
            title,
            message,
            event_id: eventId,
            is_read: false
          }));

          const { error } = await supabase
            .from('notifications')
            .insert(notifications);

          if (error) throw error;
        }
      }

      toast.success(`Volunteer opportunity posted: ${roleNeeded} for ${eventTitle}`);
      return true;
    } catch (error) {
      console.error('Error sending volunteer notification:', error);
      return false;
    }
  };

  // Set up real-time notifications
  useEffect(() => {
    if (!userId) {
      console.log('useNotifications: No user, skipping setup');
      return;
    }

    console.log('useNotifications: Setting up for user:', userId);
    fetchNotifications();

    // Set up real-time subscription
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('useNotifications: Received new notification:', payload);
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show browser notification
        sendBrowserNotification(newNotification.title, newNotification.message);

        // Show toast
        toast.success(newNotification.title);
      })
      .subscribe();

    console.log('useNotifications: Subscription created');

    return () => {
      console.log('useNotifications: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [userId, fetchNotifications]);

  // Request permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    sendVolunteerOpportunityNotification,
    requestNotificationPermission
  };
};
