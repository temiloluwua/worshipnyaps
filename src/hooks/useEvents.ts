import { useState, useEffect } from 'react';
import { supabase, Event, EventAttendee } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all public events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          locations (
            name,
            address,
            latitude,
            longitude
          ),
          users!events_host_id_fkey (
            name
          )
        `)
        .eq('is_private', false)
        .eq('status', 'upcoming')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's events (hosting or attending)
  const fetchMyEvents = async () => {
    if (!user) return;

    try {
      // Get events user is hosting
      const { data: hostedEvents, error: hostedError } = await supabase
        .from('events')
        .select(`
          *,
          locations (
            name,
            address
          )
        `)
        .eq('host_id', user.id)
        .order('date', { ascending: true });

      if (hostedError) throw hostedError;

      // Get events user is attending
      const { data: attendingEvents, error: attendingError } = await supabase
        .from('event_attendees')
        .select(`
          *,
          events (
            *,
            locations (
              name,
              address
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'registered');

      if (attendingError) throw attendingError;

      const allMyEvents = [
        ...(hostedEvents || []).map(event => ({ ...event, role: 'host' })),
        ...(attendingEvents || []).map(item => ({ ...item.events, role: 'attendee' }))
      ];

      setMyEvents(allMyEvents);
    } catch (error) {
      console.error('Error fetching my events:', error);
      toast.error('Failed to load your events');
    }
  };

  // Create new event
  const createEvent = async (eventData: Partial<Event>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          host_id: user.id,
          status: 'upcoming'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Event created successfully!');
      await fetchEvents();
      await fetchMyEvents();
      return data;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  };

  // RSVP to event
  const rsvpToEvent = async (eventId: string, volunteerRoles: string[] = [], foodItems: string[] = []) => {
    if (!user) return false;

    try {
      // Check if already registered
      const { data: existing } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast.error('You are already registered for this event');
        return false;
      }

      // Register for event
      const { error: rsvpError } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered'
        });

      if (rsvpError) throw rsvpError;

      // Add volunteer roles if any
      if (volunteerRoles.length > 0) {
        const volunteerData = volunteerRoles.map(role => ({
          user_id: user.id,
          role_type: role,
          is_active: true
        }));

        await supabase
          .from('volunteer_roles')
          .upsert(volunteerData);
      }

      // Add food items if any
      if (foodItems.length > 0) {
        const foodData = foodItems.map(item => ({
          event_id: eventId,
          item,
          assigned_to: user.id,
          completed: false
        }));

        await supabase
          .from('food_items')
          .insert(foodData);
      }

      // Notify host
      const { data: event } = await supabase
        .from('events')
        .select('title, host_id')
        .eq('id', eventId)
        .single();

      if (event) {
        await createNotification(
          event.host_id,
          'general',
          'New RSVP',
          `Someone just RSVP'd to your event: ${event.title}`
        );
      }

      toast.success('RSVP confirmed!');
      await fetchEvents();
      await fetchMyEvents();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Cancel RSVP
  const cancelRsvp = async (eventId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('RSVP cancelled');
      await fetchEvents();
      await fetchMyEvents();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Get event attendees
  const getEventAttendees = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          users (
            name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching attendees:', error);
      return [];
    }
  };

  // Update event
  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    try {
      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Event updated successfully!');
      await fetchEvents();
      await fetchMyEvents();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Event deleted successfully!');
      await fetchEvents();
      await fetchMyEvents();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchMyEvents();
    }
  }, [user]);

  return {
    events,
    myEvents,
    loading,
    fetchEvents,
    fetchMyEvents,
    createEvent,
    rsvpToEvent,
    cancelRsvp,
    getEventAttendees,
    updateEvent,
    deleteEvent
  };
};