import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Calendar, Users, Clock, Heart, Share2, Copy, Eye, EyeOff, Map, Plus } from 'lucide-react';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../hooks/useAuth';
import { InteractiveMap } from './InteractiveMap';
import { RSVPModal } from './RSVPModal';
import { AuthModal } from '../auth/AuthModal';
import type { Event as DbEvent } from '../../lib/supabase';

export function LocationsView() {
  const { user } = useAuth();
  const { events, loading, rsvpToEvent, cancelRsvp } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [rsvpEvents, setRsvpEvents] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DbEvent | null>(null);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const categories = ['All', 'bible-study', 'basketball-yap', 'hiking-yap', 'other'];

  const filteredEvents = selectedCategory === 'All' 
    ? events 
    : events.filter(event => event.type === selectedCategory);

  const toggleLike = (eventId: string) => {
    const newLiked = new Set(likedEvents);
    if (newLiked.has(eventId)) {
      newLiked.delete(eventId);
    } else {
      newLiked.add(eventId);
    }
    setLikedEvents(newLiked);
  };

  const handleRSVP = (event: DbEvent) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (event.attendees && event.attendees >= event.capacity) {
      toast.error('Event is at full capacity');
      return;
    }

    setSelectedEvent(event);
    setShowRSVPModal(true);
  };

  const confirmRSVP = async (eventId: string, volunteerRoles: string[], foodItems: string[]) => {
    const success = await rsvpToEvent(eventId, volunteerRoles, foodItems);
    if (success) {
      setRsvpEvents(prev => new Set(prev).add(eventId));
    }
  };

  const handleCancelRSVP = async (eventId: string) => {
    const success = await cancelRsvp(eventId);
    if (success) {
      setRsvpEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const shareEvent = async (event: any) => {
    const shareUrl = `${window.location.origin}/event/${event.id}`;
    const shareText = `Join us for ${event.title} on ${event.date} at ${event.time}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Event shared!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyEventLink(event);
        }
      }
    } else {
      copyEventLink(event);
    }
  };

  const copyEventLink = (event: any) => {
    const shareUrl = `${window.location.origin}/event/${event.id}`;
    const inviteText = event.is_private
      ? `${event.title}\n${event.date} at ${event.time}\nInvite code: ${event.invite_code}\n\n${shareUrl}`
      : `${event.title}\n${event.date} at ${event.time}\n\n${shareUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
      toast.success('Event link copied to clipboard!');
    }
  };

  const handleMapEventClick = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      const element = document.getElementById(`event-${eventId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading events...</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <h1 className="text-2xl font-bold mb-2">Events Near You</h1>
        <p className="text-blue-100">Discover Bible studies and gatherings in Calgary</p>
        
        {/* Map Toggle */}
        <button
          onClick={() => setShowMap(!showMap)}
          className="mt-3 flex items-center space-x-2 bg-white/20 px-3 py-2 rounded-lg text-sm hover:bg-white/30 transition-colors"
        >
          <Map className="w-4 h-4" />
          <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
        </button>
      </div>

      {/* Host Event CTA */}
      <div className="p-4 bg-gradient-to-r from-green-500 to-blue-500">
        <button
          onClick={() => user ? toast.success('Host Event feature coming soon!') : setShowAuthModal(true)}
          className="w-full bg-white text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all shadow-md flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Host an Event</span>
        </button>
        <p className="text-center text-sm text-white/90 mt-2">
          Open your home for Bible study, basketball & yap, or community activities
        </p>
      </div>

      {/* Interactive Map */}
      {showMap && (
        <div className="p-4 bg-gray-50">
          <div className="bg-gray-200 h-80 rounded-lg flex items-center justify-center">
            <p className="text-gray-600">Map integration coming soon!</p>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="p-4 bg-gray-50">
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {category === 'All' ? 'All' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-4">
        {filteredEvents.map((event) => (
          <div key={event.id} id={`event-${event.id}`} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    {event.is_private && (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {event.type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {event.is_private && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        Private
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="font-medium">{event.date}</div>
                  <div>{event.time}</div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-3">{event.description}</p>

              {/* Location & Distance */}
              <div className="flex items-center text-gray-500 text-sm mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="flex-1">{event.locations?.name || 'Location TBD'}</span>
                <span className="text-blue-600 font-medium">Calgary</span>
              </div>

              {/* Host */}
              <div className="flex items-center text-gray-500 text-sm mb-2">
                <Users className="w-4 h-4 mr-1" />
                <span>Hosted by {event.users?.name || 'Host'}</span>
              </div>

              {/* Capacity */}
              <div className="flex items-center text-gray-500 text-sm mb-4">
                <div className="flex items-center mr-4">
                  <span className="font-medium">{event.attendees || 0}/{event.capacity} attending</span>
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${((event.attendees || 0) / event.capacity) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* RSVP Status */}
              {rsvpEvents.has(event.id) && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">You're attending!</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <button
                    onClick={() => toggleLike(event.id)}
                    className={`flex items-center space-x-1 text-sm transition-colors ${
                      likedEvents.has(event.id)
                        ? 'text-red-600'
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedEvents.has(event.id) ? 'fill-current' : ''}`} />
                    <span>Interested</span>
                  </button>
                  <button
                    onClick={() => shareEvent(event)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
                
                {rsvpEvents.has(event.id) ? (
                  <button 
                    onClick={() => handleCancelRSVP(event.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Cancel RSVP
                  </button>
                ) : (
                  <button 
                    onClick={() => handleRSVP(event)}
                    disabled={(event.attendees || 0) >= event.capacity}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (event.attendees || 0) >= event.capacity
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {(event.attendees || 0) >= event.capacity ? 'Full' : 'RSVP'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RSVP Modal */}
      {selectedEvent && (
        <RSVPModal
          event={selectedEvent}
          isOpen={showRSVPModal}
          onClose={() => {
            setShowRSVPModal(false);
            setSelectedEvent(null);
          }}
          onRSVP={confirmRSVP}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  );
}
