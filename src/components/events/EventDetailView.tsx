import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { MapPin, Calendar, Users, Clock, Share2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Event as DbEvent } from '../../lib/supabase';

interface EventDetailViewProps {
  eventId: string;
  onBack: () => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({ eventId, onBack }) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<DbEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRsvped, setIsRsvped] = useState(false);

  useEffect(() => {
    fetchEvent();
    if (user) {
      checkRsvpStatus();
    }
  }, [eventId, user]);

  const fetchEvent = async () => {
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
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const checkRsvpStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .maybeSingle();

      if (!error && data) {
        setIsRsvped(true);
      }
    } catch (error) {
      console.error('Error checking RSVP status:', error);
    }
  };

  const handleRSVP = async () => {
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered',
        });

      if (error) throw error;
      setIsRsvped(true);
      toast.success('RSVP confirmed!');
    } catch (error: any) {
      console.error('Error RSVPing:', error);
      toast.error(error.message || 'Failed to RSVP');
    }
  };

  const shareEvent = async () => {
    if (!event) return;

    const shareUrl = window.location.href;
    const shareText = `Join us for ${event.title} on ${event.date} at ${event.time}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  const copyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">This event may have been removed or the link is invalid.</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold">Event Details</h1>
            <button
              onClick={shareEvent}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Event Content */}
        <div className="p-6">
          {/* Event Type Badge */}
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {event.type.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">{event.description}</p>

          {/* Event Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900">{event.date}</div>
                <div className="text-sm text-gray-600">Date</div>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900">{event.time}</div>
                <div className="text-sm text-gray-600">Time</div>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900">
                  {event.locations?.name || 'Location TBD'}
                </div>
                <div className="text-sm text-gray-600">
                  {event.locations?.address || 'Address provided after RSVP'}
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <Users className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <div className="font-medium text-gray-900">
                  Hosted by {event.users?.name || 'Host'}
                </div>
                <div className="text-sm text-gray-600">
                  {event.attendees || 0} / {event.capacity} attending
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Event Capacity</span>
              <span>{Math.round(((event.attendees || 0) / event.capacity) * 100)}% full</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${((event.attendees || 0) / event.capacity) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* RSVP Status */}
          {isRsvped && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">You're attending this event!</p>
            </div>
          )}

          {/* RSVP Button */}
          {!isRsvped && (
            <button
              onClick={handleRSVP}
              disabled={(event.attendees || 0) >= event.capacity}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                (event.attendees || 0) >= event.capacity
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {(event.attendees || 0) >= event.capacity ? 'Event Full' : 'RSVP Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
