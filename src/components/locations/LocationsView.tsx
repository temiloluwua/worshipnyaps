import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Users, Heart, Share2, EyeOff, Map, Plus, X, Lock, UserCheck, MessageCircle, Search, Calendar, Navigation, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../hooks/useAuth';
import { RSVPModal } from './RSVPModal';
import { InteractiveMap } from './InteractiveMap';
import { AuthModal } from '../auth/AuthModal';
import { EventDescriptionForm } from '../events/EventDescriptionTemplate';
import type { Event as DbEvent, DescriptionTemplate } from '../../lib/supabase';

interface LocationsViewProps {
  onOpenEvent?: (eventId: string) => void;
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'month';
type EventTab = 'discover' | 'my-rsvps';

export function LocationsView({ onOpenEvent }: LocationsViewProps = {}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { events, myEvents, loading, rsvpEventIds, rsvpToEvent, cancelRsvp } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DbEvent | null>(null);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<EventTab>('discover');

  const categories = ['All', 'bible-study', 'basketball-yap', 'hiking-yap', 'other'];

  const getDateRange = (filter: DateFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    const end = new Date(today);

    switch (filter) {
      case 'today':
        end.setHours(23, 59, 59, 999);
        break;
      case 'tomorrow':
        start.setDate(start.getDate() + 1);
        end.setDate(end.getDate() + 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        end.setDate(end.getDate() + 30);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        return null;
    }
    return { start, end };
  };

  const filteredEvents = useMemo(() => {
    let result = selectedCategory === 'All'
      ? events
      : events.filter(event => event.type === selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.locations?.name?.toLowerCase().includes(query)
      );
    }

    const dateRange = getDateRange(dateFilter);
    if (dateRange) {
      result = result.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= dateRange.start && eventDate <= dateRange.end;
      });
    }

    return result.sort((a, b) => {
      const aDate = new Date(`${a.date} ${a.time}`);
      const bDate = new Date(`${b.date} ${b.time}`);
      return aDate.getTime() - bDate.getTime();
    });
  }, [events, selectedCategory, searchQuery, dateFilter]);

  const myRsvpEvents = useMemo(() => {
    return Array.from(rsvpEventIds)
      .map(id => events.find(e => e.id === id))
      .filter((e): e is DbEvent => e !== undefined)
      .sort((a, b) => {
        const aDate = new Date(`${a.date} ${a.time}`);
        const bDate = new Date(`${b.date} ${b.time}`);
        return aDate.getTime() - bDate.getTime();
      });
  }, [events, rsvpEventIds]);

  const mapEvents = filteredEvents
    .filter(e => e.locations?.latitude && e.locations?.longitude)
    .map(e => ({
      id: e.id,
      title: e.title,
      time: `${e.date} ${e.time}`,
      attendees: e.attendees || 0,
      capacity: e.capacity,
      coordinates: { lat: e.locations!.latitude, lng: e.locations!.longitude },
      isPrivate: e.is_private,
      category: e.type,
    }));

  const toggleLike = (eventId: string) => {
    const newLiked = new Set(likedEvents);
    if (newLiked.has(eventId)) newLiked.delete(eventId);
    else newLiked.add(eventId);
    setLikedEvents(newLiked);
  };

  const handleRSVP = (event: DbEvent) => {
    if (!user) { setShowAuthModal(true); return; }
    if ((event.attendees || 0) >= event.capacity) { toast.error(t('events.eventFull')); return; }
    setSelectedEvent(event);
    setShowRSVPModal(true);
  };

  const confirmRSVP = async (eventId: string, volunteerRoles: string[], foodItems: string[]) => {
    const success = await rsvpToEvent(eventId, volunteerRoles, foodItems);
    if (!success) throw new Error('RSVP failed');
  };

  const handleCancelRSVP = async (eventId: string) => {
    const success = await cancelRsvp(eventId);
    if (!success) toast.error('Could not update RSVP');
  };

  const buildShareUrl = (event: DbEvent) => {
    const url = new URL(`/event/${event.id}`, window.location.origin);
    if (event.invite_code) url.searchParams.set('invite', event.invite_code);
    return url.toString();
  };

  const shareEvent = async (event: DbEvent) => {
    const shareUrl = buildShareUrl(event);
    const shareText = `Join us for ${event.title} on ${event.date} at ${event.time}!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url: shareUrl });
        toast.success(t('events.eventShared'));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        await copyEventLink(event);
      }
    } else {
      await copyEventLink(event);
    }
  };

  const copyEventLink = async (event: DbEvent) => {
    const shareUrl = buildShareUrl(event);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('events.linkCopied'));
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleMapEventClick = (eventId: string) => {
    const element = document.getElementById(`event-${eventId}`);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const getSpotsSummary = (event: DbEvent) => {
    const attendeeCount = event.attendees || 0;
    const safeCapacity = Math.max(event.capacity || 1, 1);
    const spotsLeft = safeCapacity - attendeeCount;
    return { attendeeCount, spotsLeft, safeCapacity, isLow: spotsLeft <= 2, isFull: spotsLeft <= 0 };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const displayEvents = activeTab === 'my-rsvps' ? myRsvpEvents : filteredEvents;

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen pb-24">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <h1 className="text-2xl font-bold mb-1">{t('events.nearYou')}</h1>
        <p className="text-blue-100 text-sm">{t('events.discover')}</p>
        <button
          onClick={() => setShowMap(!showMap)}
          className="mt-3 flex items-center space-x-2 bg-white/20 px-3 py-2 rounded-lg text-sm hover:bg-white/30 transition-colors"
        >
          <Map className="w-4 h-4" />
          <span>{showMap ? t('events.hideMap') : t('events.showMap')}</span>
        </button>
      </div>

      <div className="p-4 bg-gradient-to-r from-green-500 to-blue-500">
        <button
          onClick={() => user ? setShowHostModal(true) : setShowAuthModal(true)}
          className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-md flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{t('events.hostEvent')}</span>
        </button>
      </div>

      {user && myRsvpEvents.length > 0 && (
        <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'discover'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my-rsvps')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors relative ${
              activeTab === 'my-rsvps'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            My RSVPs
            {myRsvpEvents.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {myRsvpEvents.length}
              </span>
            )}
          </button>
        </div>
      )}

      {showMap && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800">
          <InteractiveMap events={mapEvents} onEventClick={handleMapEventClick} />
        </div>
      )}

      {activeTab === 'discover' && (
        <>
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Toggle map"
              >
                <Map className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {(['all', 'today', 'tomorrow', 'week', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    dateFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {category === 'All' ? t('common.all') : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="p-4 space-y-4">
        {displayEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{activeTab === 'my-rsvps' ? 'No RSVPs yet' : 'No events found'}</p>
            <p className="text-sm mt-1">
              {activeTab === 'my-rsvps' ? 'Events you RSVP to will appear here' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          displayEvents.map((event) => {
            const { attendeeCount, spotsLeft, safeCapacity, isLow, isFull } = getSpotsSummary(event);
            const capacityPercentage = Math.min(100, Math.round((attendeeCount / safeCapacity) * 100));
            const isRsvped = rsvpEventIds.has(event.id);

            return (
              <div
                key={event.id}
                id={`event-${event.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                        {event.is_private && <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      </div>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                          {event.type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {event.visibility === 'friends_only' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                            <UserCheck className="w-3 h-3" />
                            Friends
                          </span>
                        )}
                        {event.visibility === 'private' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-0.5 justify-end mb-1">
                        <Calendar className="w-3 h-3" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-0.5 justify-end">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{event.description}</p>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{event.locations?.name || 'Location TBD'}</span>
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">by {event.users?.name || 'Host'}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${isFull ? 'text-red-600 dark:text-red-400' : isLow ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {isFull ? 'Event Full' : isLow ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left!` : `${spotsLeft} spots available`}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{attendeeCount}/{safeCapacity}</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isFull ? 'bg-red-200 dark:bg-red-900/30' : isLow ? 'bg-orange-200 dark:bg-orange-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-red-600' : isLow ? 'bg-orange-600' : 'bg-blue-600'}`}
                        style={{ width: `${capacityPercentage}%` }}
                      />
                    </div>
                  </div>

                  {isRsvped && (
                    <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-800 dark:text-green-300">You're attending</p>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => toggleLike(event.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        likedEvents.has(event.id)
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${likedEvents.has(event.id) ? 'fill-current' : ''}`} />
                      Interested
                    </button>
                    <button
                      onClick={() => copyEventLink(event)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                    <button
                      onClick={() => onOpenEvent?.(event.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      View
                    </button>
                  </div>

                  {isRsvped ? (
                    <button
                      onClick={() => handleCancelRSVP(event.id)}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Cancel RSVP
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRSVP(event)}
                      disabled={isFull}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isFull
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isFull ? 'Event Full' : 'RSVP'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedEvent && (
        <RSVPModal
          event={selectedEvent}
          isOpen={showRSVPModal}
          onClose={() => { setShowRSVPModal(false); setSelectedEvent(null); }}
          onRSVP={confirmRSVP}
        />
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />

      {showHostModal && (
        <HostEventModal
          onClose={() => setShowHostModal(false)}
          onEventCreated={(eventId) => onOpenEvent?.(eventId)}
        />
      )}
    </div>
  );
}

interface HostEventModalProps {
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
}

function HostEventModal({ onClose, onEventCreated }: HostEventModalProps) {
  const { t } = useTranslation();
  const { createEvent } = useEvents();
  const [submitting, setSubmitting] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);
  const [descriptionTemplate, setDescriptionTemplate] = useState<DescriptionTemplate>({
    whatToExpect: '',
    whatToBring: [],
    parkingDirections: '',
    contactInfo: '',
    specialNotes: ''
  });
  const [formData, setFormData] = useState({
    eventTitle: '',
    eventType: 'bible-study',
    eventDate: '',
    eventTime: '',
    capacity: 12,
    description: '',
    visibility: 'public' as 'public' | 'private' | 'friends_only'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.eventTitle.trim()) {
      toast.error('Please enter an event title');
      setSubmitting(false);
      return;
    }

    const eventData: Record<string, any> = {
      title: formData.eventTitle,
      type: formData.eventType,
      date: formData.eventDate,
      time: formData.eventTime,
      capacity: formData.capacity,
      visibility: formData.visibility,
      is_private: formData.visibility === 'private'
    };

    if (useTemplate) {
      const hasTemplateContent =
        descriptionTemplate.whatToExpect?.trim() ||
        (Array.isArray(descriptionTemplate.whatToBring) && descriptionTemplate.whatToBring.length > 0) ||
        descriptionTemplate.parkingDirections?.trim() ||
        descriptionTemplate.contactInfo?.trim() ||
        descriptionTemplate.specialNotes?.trim();

      if (!hasTemplateContent) {
        toast.error('Please fill in at least one template field');
        setSubmitting(false);
        return;
      }

      eventData.description_template = {
        whatToExpect: descriptionTemplate.whatToExpect || '',
        whatToBring: Array.isArray(descriptionTemplate.whatToBring) ? descriptionTemplate.whatToBring : [],
        parkingDirections: descriptionTemplate.parkingDirections || '',
        contactInfo: descriptionTemplate.contactInfo || '',
        specialNotes: descriptionTemplate.specialNotes || ''
      };
      eventData.description = descriptionTemplate.whatToExpect || 'Event details available in the template';
    } else {
      if (!formData.description.trim()) {
        toast.error('Please enter an event description');
        setSubmitting(false);
        return;
      }
      eventData.description = formData.description;
    }

    const result = await createEvent(eventData);
    setSubmitting(false);

    if (result) {
      onClose();
      onEventCreated?.(result.id);
    }
  };

  const visibilityOptions = [
    { value: 'public', label: t('common.public'), description: t('events.publicDesc') },
    { value: 'friends_only', label: t('events.friendsOnly'), description: t('events.friendsOnlyDesc') },
    { value: 'private', label: t('common.private'), description: t('events.privateDesc') }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('events.hostEvent')}</h2>
          <button onClick={onClose} type="button" className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.eventTitle')}</label>
            <input
              type="text"
              name="eventTitle"
              value={formData.eventTitle}
              onChange={handleInputChange}
              placeholder={t('events.eventTitlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.eventType')}</label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="bible-study">Bible Study</option>
                <option value="basketball-yap">Basketball & Yap</option>
                <option value="hiking-yap">Hiking & Yap</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.capacity')}</label>
              <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} min="4" max="300" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.date')}</label>
              <input type="date" name="eventDate" value={formData.eventDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.time')}</label>
              <input type="time" name="eventTime" value={formData.eventTime} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-xs">
                <button type="button" onClick={() => setUseTemplate(false)} className={`px-3 py-1 rounded-md transition-colors ${!useTemplate ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {t('eventTemplate.freeform')}
                </button>
                <button type="button" onClick={() => setUseTemplate(true)} className={`px-3 py-1 rounded-md transition-colors ${useTemplate ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {t('eventTemplate.useTemplate')}
                </button>
              </div>
            </div>
            {useTemplate ? (
              <EventDescriptionForm template={descriptionTemplate} onChange={setDescriptionTemplate} />
            ) : (
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe your event..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('events.whoCanSee')}</label>
            <div className="space-y-2">
              {visibilityOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.visibility === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input type="radio" name="visibility" value={option.value} checked={formData.visibility === option.value} onChange={handleInputChange} className="mt-1 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {submitting ? t('events.creatingEvent') : t('events.createEvent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
