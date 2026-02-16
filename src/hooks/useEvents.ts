import { useState, useEffect, useRef } from 'react';
import { supabase, Event } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPACITY_CACHE_KEY = 'event_capacity_cache_v1';

const generateInviteCode = (length = 8) => {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
    code += INVITE_CODE_CHARS[randomIndex];
  }
  return code;
};

const readCapacityCache = () => {
  if (typeof window === 'undefined') return {} as Record<string, number>;
  try {
    const raw = window.localStorage.getItem(CAPACITY_CACHE_KEY);
    if (!raw) return {} as Record<string, number>;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {} as Record<string, number>;
  }
};

const writeCapacityCache = (cache: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CAPACITY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache write errors (storage disabled/full).
  }
};

export const useEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [rsvpEventIds, setRsvpEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const capacityCacheRef = useRef<Record<string, number>>(readCapacityCache());

  const getCachedCapacity = (eventId: string) => capacityCacheRef.current[eventId] || 0;

  const setCachedCapacity = (eventId: string, capacity: number) => {
    if (capacity <= 0) return;
    const previous = capacityCacheRef.current[eventId] || 0;
    if (capacity <= previous) return;

    capacityCacheRef.current = {
      ...capacityCacheRef.current,
      [eventId]: capacity
    };
    writeCapacityCache(capacityCacheRef.current);
  };

  const fetchAttendeeCountMap = async (eventIds: string[]) => {
    if (eventIds.length === 0) return new Map<string, number>();

    try {
      const uniqueEventIds = Array.from(new Set(eventIds));
      const { data, error } = await supabase
        .from('event_attendees')
        .select('event_id')
        .in('event_id', uniqueEventIds)
        .eq('status', 'registered');

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data || []) {
        counts.set(row.event_id, (counts.get(row.event_id) || 0) + 1);
      }
      return counts;
    } catch (error) {
      console.error('Error fetching attendee counts:', error);
      return new Map<string, number>();
    }
  };

  const attachAttendeeCounts = async (inputEvents: Event[]) => {
    const attendeeCountMap = await fetchAttendeeCountMap(inputEvents.map((event) => event.id));
    return inputEvents.map((event) => ({
      ...event,
      attendees: attendeeCountMap.get(event.id) || 0
    }));
  };

  // Fetch all visible events (public + friends-only for connected users)
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // First get public events
      const { data: publicEvents, error: publicError } = await supabase
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
        .or('visibility.eq.public,visibility.is.null')
        .eq('status', 'upcoming')
        .order('date', { ascending: true });

      if (publicError) {
        console.error('Error fetching public events:', publicError);
        throw publicError;
      }

      let allEvents = publicEvents || [];

      // If user is logged in, also fetch friends-only events from connections
      if (user) {
        // Always include events hosted by the current user, regardless of visibility.
        const { data: hostedEvents, error: hostedError } = await supabase
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
          .eq('host_id', user.id)
          .eq('status', 'upcoming')
          .order('date', { ascending: true });

        if (!hostedError && hostedEvents) {
          const existingIds = new Set(allEvents.map(e => e.id));
          const uniqueHostedEvents = hostedEvents.filter(e => !existingIds.has(e.id));
          allEvents = [...allEvents, ...uniqueHostedEvents];
        }

        const { data: connections } = await supabase
          .from('connections')
          .select('connected_user_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        const friendIds = connections?.map(c => c.connected_user_id) || [];

        if (friendIds.length > 0) {
          const { data: friendEvents, error: friendError } = await supabase
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
            .eq('visibility', 'friends_only')
            .in('host_id', friendIds)
            .eq('status', 'upcoming')
            .order('date', { ascending: true });

          if (!friendError && friendEvents) {
            const existingIds = new Set(allEvents.map(e => e.id));
            const uniqueFriendEvents = friendEvents.filter(e => !existingIds.has(e.id));
            allEvents = [...allEvents, ...uniqueFriendEvents];
          }
        }
      }

      const eventsWithCounts = await attachAttendeeCounts(allEvents);
      setEvents((previousEvents) => {
        const previousCapacityById = new Map(
          previousEvents.map((event) => [event.id, event.capacity])
        );

        const normalizedEvents = eventsWithCounts.map((event) => {
          const previousCapacity = previousCapacityById.get(event.id);
          const cachedCapacity = getCachedCapacity(event.id);
          const stableCapacity = previousCapacity
            ? Math.max(previousCapacity, cachedCapacity, event.capacity, event.attendees || 0)
            : Math.max(cachedCapacity, event.capacity, event.attendees || 0);

          setCachedCapacity(event.id, stableCapacity);

          return {
            ...event,
            capacity: stableCapacity
          };
        });

        normalizedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return normalizedEvents;
      });
    } catch (error: any) {
      console.error('Error fetching events:', error);
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        toast.error('Unable to connect to database. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRsvpEventIds = async () => {
    if (!user) {
      setRsvpEventIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'registered');

      if (error) throw error;

      setRsvpEventIds(new Set((data || []).map((item) => item.event_id)));
    } catch (error) {
      console.error('Error fetching RSVP status:', error);
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

      const myEventsWithCounts = await attachAttendeeCounts(allMyEvents as Event[]);
      setMyEvents((previousEvents) => {
        const previousCapacityById = new Map(
          previousEvents.map((event) => [event.id, event.capacity])
        );

        return myEventsWithCounts.map((event) => {
          const previousCapacity = previousCapacityById.get(event.id);
          const cachedCapacity = getCachedCapacity(event.id);
          const stableCapacity = previousCapacity
            ? Math.max(previousCapacity, cachedCapacity, event.capacity, event.attendees || 0)
            : Math.max(cachedCapacity, event.capacity, event.attendees || 0);

          setCachedCapacity(event.id, stableCapacity);

          return {
            ...event,
            capacity: stableCapacity
          };
        });
      });
    } catch (error) {
      console.error('Error fetching my events:', error);
      toast.error('Failed to load your events');
    }
  };

  // Create new event
  const createEvent = async (eventData: Partial<Event>) => {
    if (!user) return null;

    try {
      const needsInviteCode = eventData.visibility === 'private' || eventData.is_private;

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          invite_code: eventData.invite_code || (needsInviteCode ? generateInviteCode() : null),
          host_id: user.id,
          status: 'upcoming'
        })
        .select()
        .single();

      if (error) throw error;
      if (data?.id && data?.capacity) {
        setCachedCapacity(data.id, data.capacity);
      }

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
  const rsvpToEvent = async (eventId: string, volunteerRoles: string[] = [], foodItems: string[] = [], customFoodDetails?: { item: string; category: string; servingSize?: string; notes?: string }) => {
    if (!user) return false;

    try {
      const { data: existing } = await supabase
        .from('event_attendees')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isAlreadyRegistered = existing?.status === 'registered';

      if (!isAlreadyRegistered) {
        const { error: rsvpError } = await supabase
          .from('event_attendees')
          .upsert(
            {
              event_id: eventId,
              user_id: user.id,
              status: 'registered'
            },
            { onConflict: 'event_id,user_id' }
          );

        if (rsvpError) throw rsvpError;
      }

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
        const foodData = foodItems.map(item => {
          // Check if it's a custom item with details
          if (customFoodDetails && item.includes(customFoodDetails.item)) {
            return {
              event_id: eventId,
              item: customFoodDetails.item,
              category: customFoodDetails.category,
              assigned_to: user.id,
              completed: false,
              notes: customFoodDetails.notes
            };
          }
          
          // Handle existing food items
          return {
            event_id: eventId,
            item,
            assigned_to: user.id,
            completed: false
          };
        });

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
        // TODO: Implement notification system
        // await createNotification(
        //   event.host_id,
        //   'general',
        //   'New RSVP',
        //   `Someone just RSVP'd to your event: ${event.title}`
        // );
      }

      setRsvpEventIds(prev => new Set(prev).add(eventId));
      toast.success(isAlreadyRegistered ? 'RSVP updated!' : 'RSVP confirmed!');
      await fetchEvents();
      await fetchMyEvents();
      await fetchRsvpEventIds();
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
        .upsert(
          {
            event_id: eventId,
            user_id: user.id,
            status: 'cancelled'
          },
          { onConflict: 'event_id,user_id' }
        );

      if (error) throw error;

      setRsvpEventIds(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      toast.success('RSVP updated');
      await fetchEvents();
      await fetchMyEvents();
      await fetchRsvpEventIds();
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
      fetchRsvpEventIds();
    } else {
      setRsvpEventIds(new Set());
    }
  }, [user]);

  const isEventRsvped = (eventId: string) => rsvpEventIds.has(eventId);

  return {
    events,
    myEvents,
    rsvpEventIds,
    loading,
    fetchEvents,
    fetchMyEvents,
    fetchRsvpEventIds,
    createEvent,
    isEventRsvped,
    rsvpToEvent,
    cancelRsvp,
    getEventAttendees,
    updateEvent,
    deleteEvent
  };
};
