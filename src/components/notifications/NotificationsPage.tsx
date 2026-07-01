import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell, Heart, MessageCircle, UserPlus, Calendar,
  Settings, Check, Repeat, AtSign, HeartHandshake, X as XIcon
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { useConnections } from '../../hooks/useConnections';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { SettingsModal } from '../SettingsModal';
import toast from 'react-hot-toast';

type NotificationCategory = 'all' | 'social' | 'events' | 'system';

interface NotificationsPageProps {
  onViewTopic?: (topicId: string) => void;
  onViewProfile?: (userId: string) => void;
  onViewEvent?: (eventId: string) => void;
}

interface ActorInfo { name?: string; avatar_url?: string }

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onViewTopic,
  onViewProfile,
  onViewEvent
}) => {
  const {
    notifications,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const {
    myActivities,
    loading: activitiesLoading,
    fetchMyNotifications,
    getActivityMessage
  } = useActivityFeed();
  const { acceptConnectionRequest, declineConnectionRequest } = useConnections();

  const [showSettings, setShowSettings] = useState(false);
  const [actors, setActors] = useState<Record<string, ActorInfo>>({});
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [resolvedRequestIds, setResolvedRequestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMyNotifications();
  }, [fetchMyNotifications]);

  // Batch-fetch actor profiles (avatar + name) for any notification whose
  // payload names a `user_id`. Skip ids we've already resolved.
  const actorIdsNeeded = useMemo(() => {
    const ids = new Set<string>();
    for (const n of notifications) {
      const payload = (n as any).payload;
      const uid: string | undefined = payload?.user_id;
      if (uid && !actors[uid]) ids.add(uid);
    }
    return Array.from(ids);
  }, [notifications, actors]);

  useEffect(() => {
    if (actorIdsNeeded.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', actorIdsNeeded);
      if (cancelled || !data) return;
      setActors(prev => {
        const next = { ...prev };
        for (const u of data) {
          next[u.id] = { name: u.name, avatar_url: u.avatar_url };
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [actorIdsNeeded]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'repost':
        return <Repeat className="w-5 h-5 text-green-500" />;
      case 'follow':
      case 'connection_request':
      case 'connection_accepted':
        return <UserPlus className="w-5 h-5 text-blue-600" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case 'event':
      case 'event_reminder':
      case 'event_update':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'help_request':
        return <HeartHandshake className="w-5 h-5 text-pink-500" />;
      case 'general':
        return <Bell className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const combinedNotifications = [
    ...notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message || (n as any).body || '',
      is_read: n.is_read,
      created_at: n.created_at,
      event_id: n.event_id || (n as any).payload?.event_id,
      payload: (n as any).payload as any,
      category: (n.type.includes('event') ? 'events' : 'system') as NotificationCategory,
      source: 'notification' as const,
    })),
    ...myActivities.map(a => ({
      id: a.id,
      type: a.activity_type,
      title: '',
      message: getActivityMessage(a),
      is_read: true,
      created_at: a.created_at,
      target_id: a.target_id,
      target_type: a.target_type,
      user_id: a.user_id,
      user: a.user,
      payload: undefined as any,
      category: 'social' as NotificationCategory,
      source: 'activity' as const,
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredNotifications = combinedNotifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loading = notificationsLoading || activitiesLoading;

  const handleNotificationClick = (n: typeof filteredNotifications[number]) => {
    if (n.source === 'notification') {
      if (!n.is_read) markAsRead(n.id);
      const payload = n.payload;
      // Route by type — priority is: topic > event > profile
      if (payload?.topic_id) {
        onViewTopic?.(payload.topic_id);
        return;
      }
      if (n.event_id) {
        onViewEvent?.(n.event_id);
        return;
      }
      if (payload?.user_id) {
        onViewProfile?.(payload.user_id);
        return;
      }
    } else if (n.source === 'activity') {
      if (n.target_type === 'topic' && n.target_id) {
        onViewTopic?.(n.target_id);
      } else if (n.user_id) {
        onViewProfile?.(n.user_id);
      }
    }
  };

  const handleAccept = async (requestId: string) => {
    setRespondingRequestId(requestId);
    try {
      const ok = await acceptConnectionRequest(requestId);
      if (ok) {
        setResolvedRequestIds(prev => new Set(prev).add(requestId));
        toast.success('Connected!');
      }
    } finally {
      setRespondingRequestId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setRespondingRequestId(requestId);
    try {
      const ok = await declineConnectionRequest(requestId);
      if (ok) {
        setResolvedRequestIds(prev => new Set(prev).add(requestId));
        toast.success('Declined');
      }
    } finally {
      setRespondingRequestId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors touch-manipulation"
                  title="Mark all as read"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors touch-manipulation"
                title="Settings"
                aria-label="Open settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 px-6 max-w-sm mx-auto">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              You're all caught up!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              New RSVPs, messages, and connection requests will show up here. RSVP to an event or send a connection request to get the ball rolling.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map(notification => {
              const isConnRequest =
                notification.source === 'notification' && notification.type === 'connection_request';
              const requestId: string | undefined = notification.payload?.request_id;
              const actorId: string | undefined =
                (notification.source === 'notification' ? notification.payload?.user_id : notification.user_id);
              const actor: ActorInfo | undefined = actorId
                ? (notification.source === 'activity' && notification.user)
                  ? { name: notification.user.name, avatar_url: notification.user.avatar_url }
                  : actors[actorId]
                : undefined;
              const isResolved = requestId ? resolvedRequestIds.has(requestId) : false;
              const isResponding = requestId ? respondingRequestId === requestId : false;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors touch-manipulation ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar (if we have an actor) — otherwise the type icon. */}
                    {actor ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (actorId) onViewProfile?.(actorId);
                        }}
                        className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={actor.name ? `View ${actor.name}'s profile` : 'View profile'}
                      >
                        {actor.avatar_url ? (
                          <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                            {actor.name?.charAt(0) || '?'}
                          </div>
                        )}
                        {/* Small type-icon overlay so the reason for the notification is still visible */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow ring-1 ring-gray-200 dark:ring-gray-700">
                          {React.cloneElement(getNotificationIcon(notification.type), { className: 'w-3 h-3' } as any)}
                        </span>
                      </button>
                    ) : (
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        !notification.is_read
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {notification.source === 'notification' ? (
                        <>
                          <p className={`font-medium ${
                            !notification.is_read
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {notification.message}
                            </p>
                          )}

                          {/* Inline Accept / Decline for pending connection requests */}
                          {isConnRequest && requestId && (
                            <div className="mt-2 flex gap-2">
                              {isResolved ? (
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Responded</span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAccept(requestId); }}
                                    disabled={isResponding}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-full transition-colors touch-manipulation"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDecline(requestId); }}
                                    disabled={isResponding}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-full transition-colors touch-manipulation"
                                  >
                                    <XIcon className="w-3.5 h-3.5" />
                                    Decline
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-700 dark:text-gray-300">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
