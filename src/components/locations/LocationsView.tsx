import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Users, Heart, Share2, EyeOff, Map, Plus, X, Lock, UserCheck, MessageCircle, Search, Calendar, Navigation, Clock, AlertCircle, FileEdit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../hooks/useAuth';
import { RSVPModal } from './RSVPModal';
import { InteractiveMap } from './InteractiveMap';
import { AuthModal } from '../auth/AuthModal';
import { EventDescriptionForm } from '../events/EventDescriptionTemplate';
import { EventImageUploader } from '../events/EventImageUploader';
import { supabase } from '../../lib/supabase';
import type { Event as DbEvent, DescriptionTemplate } from '../../lib/supabase';
import { TwelveHourTimePicker } from '../ui/TimePicker';
import { geocodeAddress } from '../../lib/geocode';
import { AddressAutocomplete } from './AddressAutocomplete';
import { formatTime12h, formatDateShort, formatEventTypeLabel, formatLocationType, formatLocationNameOrType } from '../../lib/eventFormat';

interface LocationsViewProps {
  onOpenEvent?: (eventId: string) => void;
}

type CombinedFilter = 'all' | 'today' | 'bible_study_yaps' | 'church' | 'other';
type EventTab = 'discover' | 'my-events';

export function LocationsView({ onOpenEvent }: LocationsViewProps = {}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { events, loading, rsvpEventIds, rsvpToEvent, cancelRsvp, drafts, deleteEvent, fetchDrafts, pastEvents } = useEvents();
  const [combinedFilter, setCombinedFilter] = useState<CombinedFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DbEvent | null>(null);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<EventTab>('discover');

  const combinedOptions: { value: CombinedFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'bible_study_yaps', label: '📖 Bible Study / Yaps' },
    { value: 'church', label: '⛪ Church' },
    { value: 'other', label: 'Other' },
  ];

  const matchesCategory = (event: DbEvent, filter: CombinedFilter): boolean => {
    if (filter === 'all') return true;
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today && eventDate <= end;
    }
    const evType = (event as { event_type?: string }).event_type;
    if (filter === 'bible_study_yaps') {
      if (evType === 'bible_study' || evType === 'yap') return true;
      return ['bible-study', 'basketball-yap', 'hiking-yap'].includes(event.type || '');
    }
    if (filter === 'church') {
      return evType === 'church';
    }
    if (filter === 'other') {
      const known = evType === 'bible_study' || evType === 'yap' || evType === 'church';
      return !known && !['bible-study', 'basketball-yap', 'hiking-yap'].includes(event.type || '');
    }
    return true;
  };

  const filteredEvents = useMemo(() => {
    let result = events.filter(event => matchesCategory(event, combinedFilter));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.locations?.name?.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => {
      const aDate = new Date(`${a.date} ${a.time}`);
      const bDate = new Date(`${b.date} ${b.time}`);
      return aDate.getTime() - bDate.getTime();
    });
  }, [events, combinedFilter, searchQuery]);

  const myCombinedEvents = useMemo(() => {
    if (!user) return [];
    // Hosted events + events the user RSVPed to (de-duplicated).
    const ids = new Set<string>(Array.from(rsvpEventIds));
    events.forEach(e => { if (e.host_id === user.id) ids.add(e.id); });
    return Array.from(ids)
      .map(id => events.find(e => e.id === id))
      .filter((e): e is DbEvent => e !== undefined)
      .sort((a, b) => {
        const aDate = new Date(`${a.date} ${a.time}`);
        const bDate = new Date(`${b.date} ${b.time}`);
        return aDate.getTime() - bDate.getTime();
      });
  }, [events, rsvpEventIds, user]);

  // Backward-compat alias used by code below.
  const myRsvpEvents = myCombinedEvents;

  // Map only ever shows city-level fuzzed coordinates from events.area_lat/lng.
  // The exact address still flows through the existing locations RLS rules —
  // so general_area / attendees_only events can appear here without leaking
  // a precise pin.
  // Include public + friends_only events on the map. RLS has already
  // filtered the `events` set to ones the viewer is allowed to see; the
  // pin's coordinates are the trigger-fuzzed area_lat/area_lng (~11 km),
  // so a friends_only pin never leaks the host's exact address.
  const mapEvents = filteredEvents
    .filter(e =>
      (e.visibility === 'public' || e.visibility === 'friends_only') &&
      typeof e.area_lat === 'number' &&
      typeof e.area_lng === 'number' &&
      // Drop null-island (0,0) pins — they're the legacy fallback for
      // events whose address didn't geocode. Showing them puts a marker
      // off the West African coast which confuses everyone.
      !(Math.abs(e.area_lat as number) < 0.01 && Math.abs(e.area_lng as number) < 0.01)
    )
    .map(e => ({
      id: e.id,
      title: e.title,
      time: `${e.date} ${e.time}`,
      attendees: e.attendees || 0,
      capacity: e.capacity,
      coordinates: { lat: e.area_lat as number, lng: e.area_lng as number },
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
    const shareText = `Join us for ${event.title} on ${formatDateShort(event.date)} at ${formatTime12h(event.time)}!`;
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

  const displayEvents = activeTab === 'my-events' ? myCombinedEvents : filteredEvents;

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen pb-24">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <h1 className="text-2xl font-bold mb-1">{t('events.nearYou')}</h1>
        <p className="text-blue-100 text-sm">{t('events.discover')}</p>
      </div>

      <div className="p-4 bg-gradient-to-r from-green-500 to-blue-500 flex gap-2">
        <button
          onClick={() => setShowHostModal(true)}
          className="flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-white py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-md flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{t('events.hostEvent')}</span>
        </button>
        <button
          onClick={() => setShowMap((s) => !s)}
          aria-pressed={showMap}
          aria-label={showMap ? 'Hide map' : 'Show map'}
          className={`px-4 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center justify-center gap-1 ${
            showMap
              ? 'bg-blue-700 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Map className="w-5 h-5" />
          <span className="text-sm">{showMap ? 'Hide' : 'Map'}</span>
        </button>
      </div>

      {user && (
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
            onClick={() => setActiveTab('my-events')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors relative ${
              activeTab === 'my-events'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            My Events
            {(myCombinedEvents.length + drafts.length) > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {myCombinedEvents.length + drafts.length}
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
              {combinedOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCombinedFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    combinedFilter === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="p-4 space-y-4">
        {activeTab === 'my-events' && drafts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Drafts ({drafts.length})
              </h3>
            </div>
            <div className="space-y-2">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800/60 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {draft.title || 'Untitled draft'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {draft.locations?.name
                        ? draft.locations.name
                        : 'No location yet'}
                      {draft.date ? ` · ${formatDateShort(draft.date)}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenEvent?.(draft.id)}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-xs font-medium whitespace-nowrap"
                  >
                    Continue
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Discard "${draft.title || 'this draft'}"?`)) return;
                      const ok = await deleteEvent(draft.id);
                      if (ok) await fetchDrafts();
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                    title="Discard draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {displayEvents.length === 0 && !(activeTab === 'my-events' && drafts.length > 0) ? (
          <div className="text-center py-16 px-6 max-w-md mx-auto text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {activeTab === 'my-events' ? "No events here yet" : 'No events in this area yet'}
            </p>
            <p className="text-sm mb-5">
              {activeTab === 'my-events'
                ? "Events you host or RSVP to will live here. Browse Discover or host your own."
                : "Be the first to bring the community together — host an event nearby."}
            </p>
            {activeTab === 'my-events' ? (
              <button
                onClick={() => setActiveTab('discover')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Browse events
              </button>
            ) : (
              <button
                onClick={() => setShowHostModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Host an event
              </button>
            )}
          </div>
        ) : (
          displayEvents.map((event) => {
            const { attendeeCount, spotsLeft, safeCapacity, isLow, isFull } = getSpotsSummary(event);
            const capacityPercentage = Math.min(100, Math.round((attendeeCount / safeCapacity) * 100));
            const isRsvped = rsvpEventIds.has(event.id);
            const isHosting = user && event.host_id === user.id;

            return (
              <div
                key={event.id}
                id={`event-${event.id}`}
                onClick={() => onOpenEvent?.(event.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenEvent?.(event.id); }}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                  isHosting
                    ? 'border-2 border-amber-400 dark:border-amber-500 ring-2 ring-amber-200/60 dark:ring-amber-700/30'
                    : 'border border-gray-200 dark:border-gray-700'
                }`}
              >
                {(() => {
                  const imageUrl = (event as { image_url?: string | null }).image_url;
                  const evType = (event as { event_type?: string }).event_type || '';
                  const eventTypeEmoji: Record<string, string> = { bible_study: '📖', church: '⛪', yap: '✨' };
                  const locEmoji = ({ home: '🏠', church: '⛪', park: '🌿', cafe: '☕', online: '💻' } as Record<string, string>)[event.location_type || ''] || eventTypeEmoji[evType] || '✨';
                  const fallbackGradient =
                    evType === 'bible_study' ? 'from-indigo-400 via-purple-400 to-blue-500'
                    : evType === 'church'    ? 'from-violet-400 via-fuchsia-400 to-rose-500'
                    : 'from-amber-400 via-orange-400 to-rose-500';
                  return (
                    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${fallbackGradient} flex items-center justify-center`}>
                          <span className="text-6xl opacity-90 drop-shadow-sm" aria-hidden="true">{locEmoji}</span>
                        </div>
                      )}
                      {isHosting && (
                        <div className="absolute bottom-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-full shadow-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          You're hosting
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-white/95 dark:bg-gray-900/90 backdrop-blur px-2.5 py-1 rounded-full shadow text-xs font-semibold text-gray-900 dark:text-white">
                        {formatEventTypeLabel(event as any)}
                      </div>
                      <div className="absolute top-2 right-2 bg-white/95 dark:bg-gray-900/90 backdrop-blur px-2.5 py-1 rounded-full shadow text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        <span>{formatDateShort(event.date)}</span>
                        <span className="text-gray-400">·</span>
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>{formatTime12h(event.time)}</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="p-4">
                  <div className="mb-2">
                    <div className="flex items-center space-x-2 mb-1.5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">{event.title}</h3>
                      {event.is_private && <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
                    </div>
                    {(event.visibility === 'friends_only' || event.visibility === 'private') && (
                      <div className="flex items-center flex-wrap gap-1">
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
                    )}
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{event.description}</p>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatLocationNameOrType(event as any)}</span>
                      {event.locations?.name && event.location_type && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0">
                          {formatLocationType(event.location_type)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">by {event.users?.name || 'Host'}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${isFull ? 'text-red-600 dark:text-red-400' : isLow ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {isFull ? 'Event Full' : isLow ? `Almost full` : `Spots available`}
                      </span>
                      {(isRsvped || isHosting) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{attendeeCount}/{safeCapacity}</span>
                      )}
                    </div>
                    {(isRsvped || isHosting) && (
                      <div className={`w-full h-2 rounded-full overflow-hidden ${isFull ? 'bg-red-200 dark:bg-red-900/30' : isLow ? 'bg-orange-200 dark:bg-orange-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${isFull ? 'bg-red-600' : isLow ? 'bg-orange-600' : 'bg-blue-600'}`}
                          style={{ width: `${capacityPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {isRsvped && (
                    <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-800 dark:text-green-300">You're attending</p>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(event.id); }}
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
                      onClick={(e) => { e.stopPropagation(); copyEventLink(event); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                  </div>

                  {isRsvped ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelRSVP(event.id); }}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Cancel RSVP
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRSVP(event); }}
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

        {activeTab === 'my-events' && pastEvents.length > 0 && (
          <div className="mt-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Past events ({pastEvents.length})
              </h3>
            </div>
            <div className="space-y-2">
              {pastEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onOpenEvent?.(ev.id)}
                  className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{ev.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateShort(ev.date)} · {formatTime12h(ev.time)}
                      {ev.locations?.name ? ` · ${ev.locations.name}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
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
          onRequireAuth={() => setShowAuthModal(true)}
        />
      )}
    </div>
  );
}

interface HostEventModalProps {
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
  onRequireAuth?: () => void;
}

const DEFAULT_HOST_FORM = {
  eventTitle: '',
  eventType: 'bible-study',
  event_type: 'bible_study' as 'bible_study' | 'yap' | 'church',
  eventDate: '',
  eventTime: '',
  eventLocationName: '',
  eventAddress: '',
  capacity: 12,
  description: '',
  visibility: 'public' as 'public' | 'private' | 'friends_only',
  addressVisibility: 'attendees_only' as 'general_area' | 'attendees_only' | 'public',
  study_topic: '',
  session_purpose: '',
  location_type: '' as '' | 'home' | 'church' | 'park' | 'cafe' | 'online',
  yap_vibe: '',
  bring_note: '',
};

const DEFAULT_TEMPLATE: DescriptionTemplate = {
  whatToExpect: '',
  whatToBring: [],
  parkingDirections: '',
  contactInfo: '',
  specialNotes: ''
};

interface HostEventDraft {
  formData: typeof DEFAULT_HOST_FORM;
  descriptionTemplate: DescriptionTemplate;
  useTemplate: boolean;
  imageUrl: string | null;
}

function hostDraftHasContent(d: HostEventDraft): boolean {
  const f = d.formData;
  if (f.eventTitle.trim() || f.eventLocationName.trim() || f.eventAddress.trim()) return true;
  if (f.eventDate || f.eventTime || f.description.trim()) return true;
  if (d.imageUrl) return true;
  if (d.useTemplate) {
    const t = d.descriptionTemplate;
    if (t.whatToExpect?.trim() || t.parkingDirections?.trim() || t.contactInfo?.trim() || t.specialNotes?.trim()) return true;
    if (Array.isArray(t.whatToBring) && t.whatToBring.length > 0) return true;
  }
  return false;
}

function HostEventModal({ onClose, onEventCreated, onRequireAuth }: HostEventModalProps) {
  const { t } = useTranslation();
  const { createEvent } = useEvents();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [useTemplate, setUseTemplate] = useState(false);
  const [descriptionTemplate, setDescriptionTemplate] = useState<DescriptionTemplate>({ ...DEFAULT_TEMPLATE });
  const [formData, setFormData] = useState({ ...DEFAULT_HOST_FORM });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // Cached coordinates from the address autocomplete pick, so we can skip
  // a redundant Nominatim round-trip at submit time.
  const [pickedCoords, setPickedCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const hasUnsavedContent = () =>
    hostDraftHasContent({ formData, descriptionTemplate, useTemplate, imageUrl });

  const requestClose = () => {
    if (hasUnsavedContent()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();

    // Logged-out users can fill out the form to see what hosting looks like,
    // but actually creating the event requires an account.
    if (!user) {
      toast('Create an account to host your event', { icon: '🔒' });
      onRequireAuth?.();
      return;
    }

    setSubmitting(true);

    if (!formData.eventTitle.trim()) {
      toast.error('Please enter an event title');
      setSubmitting(false);
      return;
    }

    // Drafts skip the heavier required-field checks — title is enough to
    // identify them in the Drafts list. The host can fill in the rest later.
    if (!asDraft) {
      if (!formData.eventLocationName.trim() || !formData.eventAddress.trim()) {
        toast.error('Please enter a location name and address');
        setSubmitting(false);
        return;
      }

      if (!formData.eventDate || !formData.eventTime) {
        toast.error('Please pick a date and time');
        setSubmitting(false);
        return;
      }
    }

    // Safety: a home address must never go fully public.
    // Force visibility to friends_only and address_visibility to attendees_only.
    if (formData.location_type === 'home' && formData.visibility === 'public') {
      formData.visibility = 'friends_only';
      formData.addressVisibility = 'attendees_only';
      toast('Home events are kept friends-only to protect your address.', { icon: '🔒' });
    }

    // Geocode the address so the event lands on the map. If it fails (no
    // result, network error), save with 0/0 — the event still works, the
    // map just won't show a pin until someone refines the address.
    // Drafts can skip the locations row entirely if no address was entered yet.
    let locationId: string | null = null;
    const hasAddress = formData.eventLocationName.trim() && formData.eventAddress.trim();
    if (hasAddress) {
      try {
        const geo = pickedCoords ?? (await geocodeAddress(formData.eventAddress));
        const { data: locData, error: locError } = await supabase
          .from('locations')
          .insert({
            name: formData.eventLocationName.trim(),
            address: formData.eventAddress.trim(),
            latitude: geo?.latitude ?? 0,
            longitude: geo?.longitude ?? 0,
            capacity: formData.capacity,
            host_id: user?.id,
            is_approved: true,
          })
          .select()
          .single();
        if (locError) throw locError;
        locationId = locData?.id || null;
        if (!geo && !asDraft) {
          toast("Couldn't find that address on the map, but the event is saved.");
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to save location');
        setSubmitting(false);
        return;
      }
    }

    const eventData: Record<string, any> = {
      title: formData.eventTitle,
      type: formData.eventType,
      event_type: formData.event_type,
      // Date/time are NOT NULL on the events table. For drafts without a
      // chosen date/time yet, fall back to today + midnight so the row can
      // exist — the host edits these in before publishing.
      date: formData.eventDate || new Date().toISOString().slice(0, 10),
      time: formData.eventTime || '00:00',
      capacity: formData.capacity,
      image_url: imageUrl,
      visibility: formData.visibility,
      is_private: formData.visibility === 'private',
      address_visibility: formData.addressVisibility,
      location_id: locationId,
      location_type: formData.location_type || null,
      study_topic: formData.event_type === 'bible_study' ? (formData.study_topic.trim() || null) : null,
      session_purpose: formData.event_type === 'bible_study' ? (formData.session_purpose.trim() || null) : null,
      yap_vibe: formData.event_type === 'yap' ? (formData.yap_vibe || null) : null,
      bring_note: formData.event_type === 'yap' ? (formData.bring_note.trim() || null) : null,
      is_draft: asDraft,
    };

    if (useTemplate) {
      const hasTemplateContent =
        descriptionTemplate.whatToExpect?.trim() ||
        (Array.isArray(descriptionTemplate.whatToBring) && descriptionTemplate.whatToBring.length > 0) ||
        descriptionTemplate.parkingDirections?.trim() ||
        descriptionTemplate.contactInfo?.trim() ||
        descriptionTemplate.specialNotes?.trim();

      if (!hasTemplateContent && !asDraft) {
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
      eventData.description = descriptionTemplate.whatToExpect || (asDraft ? '' : 'Event details available in the template');
    } else {
      if (!formData.description.trim() && !asDraft) {
        toast.error('Please enter an event description');
        setSubmitting(false);
        return;
      }
      eventData.description = formData.description;
    }

    const result = await createEvent(eventData);
    setSubmitting(false);

    if (result) {
      if (asDraft) {
        // Don't open EventDetailView for drafts — the host wanted to step
        // away. They'll find it in the Drafts section of My Events.
        toast.success('Draft saved — you can finish it from My Events.');
        onClose();
      } else {
        // Signal to EventDetailView to open the Help tab so the host can
        // immediately add help requests and food items.
        try {
          sessionStorage.setItem('wny_event_just_created', result.id);
        } catch {
          // ignore
        }
        toast.success("Event created! Add help & food on the Help tab.");
        onClose();
        onEventCreated?.(result.id);
      }
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
      onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
        {showCloseConfirm && (
          <div className="absolute inset-0 z-30 bg-black/30 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Save as draft?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You've started filling this out. Save it as a draft so you can come back to it later.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  disabled={submitting}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCloseConfirm(false); onClose(); }}
                  disabled={submitting}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={(e) => { setShowCloseConfirm(false); handleSubmit(e as unknown as React.FormEvent, true); }}
                  disabled={submitting}
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save draft'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('events.hostEvent')}</h2>
          <button onClick={requestClose} type="button" className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!user && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <span>🔒</span>
              <span>You're previewing — you'll need an account to actually post this event. Fill it out, hit Create, and we'll prompt you to sign up.</span>
            </div>
          )}

          <EventImageUploader value={imageUrl} onChange={setImageUrl} />

          {/* What kind of gathering? — unified chip selector with Bible Study + Yap vibes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What kind of gathering is this?</label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'bible_study', label: '📖 Bible Study / Yaps', eventType: 'bible_study', vibe: '', tone: 'blue' },
                { value: 'church',      label: '⛪ Church',      eventType: 'church',      vibe: '', tone: 'violet' },
                { value: 'games',       label: '🎲 Games',       eventType: 'yap',         vibe: 'games', tone: 'amber' },
                { value: 'food',        label: '🍽️ Food / Potluck', eventType: 'yap',     vibe: 'food', tone: 'amber' },
                { value: 'sports',      label: '🏅 Sports',      eventType: 'yap',         vibe: 'sports', tone: 'amber' },
                { value: 'music',       label: '🎶 Music / Worship', eventType: 'yap',     vibe: 'music', tone: 'amber' },
                { value: 'hanging',     label: '🗣️ Just hanging', eventType: 'yap',        vibe: 'hanging', tone: 'amber' },
              ] as Array<{ value: string; label: string; eventType: 'bible_study' | 'yap' | 'church'; vibe: string; tone: 'blue' | 'violet' | 'amber' }>).map(opt => {
                const selected = opt.eventType === 'yap'
                  ? formData.event_type === 'yap' && formData.yap_vibe === opt.vibe
                  : formData.event_type === opt.eventType;
                const selectedClasses: Record<string, string> = {
                  blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
                  violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700',
                  amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                };
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(p => ({
                      ...p,
                      event_type: opt.eventType,
                      eventType: opt.eventType === 'bible_study' ? 'bible-study' : opt.eventType === 'church' ? 'church' : 'other',
                      yap_vibe: opt.vibe,
                    }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selected
                        ? selectedClasses[opt.tone]
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.capacity')}</label>
            <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} min="4" max="300" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Location type chips — shared by both event types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Where is it?</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'home', label: '🏠 Home' },
                { value: 'church', label: '⛪ Church' },
                { value: 'park', label: '🌿 Park / Outdoors' },
                { value: 'cafe', label: '☕ Café' },
                { value: 'online', label: '💻 Online' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(p => ({
                    ...p,
                    location_type: opt.value as any,
                    // Picking "home" forces a private-friendly visibility +
                    // address-visibility so the host's address can't leak.
                    ...(opt.value === 'home'
                      ? {
                          visibility: (p.visibility === 'public' ? 'friends_only' : p.visibility) as typeof p.visibility,
                          addressVisibility: (p.addressVisibility === 'public' ? 'attendees_only' : p.addressVisibility) as typeof p.addressVisibility,
                        }
                      : {}),
                  }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    formData.location_type === opt.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bible Study only */}
          {formData.event_type === 'bible_study' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What are you studying?</label>
                <input
                  type="text"
                  value={formData.study_topic}
                  onChange={(e) => setFormData(p => ({ ...p, study_topic: e.target.value }))}
                  placeholder="e.g. Romans 8 — Life in the Spirit"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Yap only — extra "bring something" prompt */}
          {formData.event_type === 'yap' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Anything to bring? (optional)</label>
              <input
                type="text"
                value={formData.bring_note}
                onChange={(e) => setFormData(p => ({ ...p, bring_note: e.target.value }))}
                placeholder="e.g. A dish to share, your guitar, nothing at all"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">General location name</label>
            <input
              type="text"
              name="eventLocationName"
              value={formData.eventLocationName}
              onChange={handleInputChange}
              placeholder="e.g. Hillhurst Community Hall"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
            <AddressAutocomplete
              name="eventAddress"
              value={formData.eventAddress}
              onChange={(val) => {
                setFormData(p => ({ ...p, eventAddress: val }));
                // Free-text edit after a pick invalidates the cached coords.
                if (pickedCoords) setPickedCoords(null);
              }}
              onPick={(s) => {
                setFormData(p => ({ ...p, eventAddress: s.displayName }));
                setPickedCoords({ latitude: s.latitude, longitude: s.longitude });
              }}
              placeholder="Start typing — pick from the suggestions"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Pick a suggestion to confirm the location on the map. Visibility is set by the "Address privacy" option below.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.date')}</label>
              <input type="date" name="eventDate" value={formData.eventDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('events.time')}</label>
              <TwelveHourTimePicker
                value={formData.eventTime}
                onChange={(v) => setFormData(p => ({ ...p, eventTime: v }))}
              />
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
            {formData.location_type === 'home' && (
              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 mb-2">
                🔒 Home events can't be public — your address would be exposed. Pick Friends Only or Private.
              </p>
            )}
            <div className="space-y-2">
              {visibilityOptions.map((option) => {
                const lockedPublicForHome = formData.location_type === 'home' && option.value === 'public';
                return (
                  <label
                    key={option.value}
                    className={`flex items-start p-3 border rounded-lg transition-all ${
                      lockedPublicForHome
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-50 cursor-not-allowed'
                        : formData.visibility === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={formData.visibility === option.value}
                      onChange={handleInputChange}
                      disabled={lockedPublicForHome}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Address privacy
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Choose who can see the exact street address. The general area is always visible.
            </p>
            <div className="space-y-2">
              {[
                { value: 'general_area', label: 'General area only', description: "Show neighborhood/city. Exact address is never revealed." },
                { value: 'attendees_only', label: 'Visible to RSVPs only', description: 'Public sees the area. Full address unlocks after RSVP.' },
                { value: 'public', label: 'Public address', description: 'Anyone can see the full address.' },
              ].map((option) => {
                const lockedPublicForHome = formData.location_type === 'home' && option.value === 'public';
                return (
                  <label
                    key={option.value}
                    className={`flex items-start p-3 border rounded-lg transition-all ${
                      lockedPublicForHome
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-50 cursor-not-allowed'
                        : formData.addressVisibility === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressVisibility"
                      value={option.value}
                      checked={formData.addressVisibility === option.value}
                      onChange={handleInputChange}
                      disabled={lockedPublicForHome}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              disabled={submitting}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save as draft'}
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
