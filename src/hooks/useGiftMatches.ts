import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { helpTypesForGifts, matchingGiftForType } from '../lib/giftMatching';

export interface GiftMatch {
  id: string; // help request id
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  hostName: string | null;
  requestType: string;
  title: string;
  description: string | null;
  matchedGift: string; // the viewer's gift that qualified this match
}

// Finds open, unassigned help requests on upcoming events whose need matches
// the viewer's spiritual gifts. RLS limits help-request reads to public events
// (or the viewer's own), so this naturally surfaces public "serve" opportunities.
export function useGiftMatches(gifts: string[] | null | undefined) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<GiftMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    const types = helpTypesForGifts(gifts);
    if (!user || types.length === 0) {
      setMatches([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_help_requests')
        .select(`
          id,
          request_type,
          title,
          description,
          status,
          assigned_user_id,
          open_to_volunteers,
          event_id,
          events!inner (
            id,
            title,
            date,
            time,
            host_id,
            status,
            users!events_host_id_fkey ( name )
          )
        `)
        .in('request_type', types)
        .eq('status', 'open')
        .is('assigned_user_id', null)
        .eq('events.status', 'upcoming')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching gift matches:', error);
        setMatches([]);
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const mapped: GiftMatch[] = (data || [])
        .filter((r: any) => r.open_to_volunteers !== false)
        .map((r: any) => {
          const event = Array.isArray(r.events) ? r.events[0] : r.events;
          return { r, event };
        })
        .filter(({ event }: any) => {
          if (!event) return false;
          if (event.host_id === user.id) return false; // not your own event
          const eventDate = new Date(`${event.date}T00:00:00`);
          return !isNaN(eventDate.getTime()) && eventDate >= todayStart;
        })
        .map(({ r, event }: any) => {
          const host = Array.isArray(event.users) ? event.users[0] : event.users;
          return {
            id: r.id,
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time ?? null,
            hostName: host?.name ?? null,
            requestType: r.request_type,
            title: r.title,
            description: r.description ?? null,
            matchedGift: matchingGiftForType(gifts, r.request_type) || '',
          } as GiftMatch;
        });

      setMatches(mapped);
    } finally {
      setLoading(false);
    }
  }, [user, gifts]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  return { matches, loading, refetch: fetchMatches };
}
