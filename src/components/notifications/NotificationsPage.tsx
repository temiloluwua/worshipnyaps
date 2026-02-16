import React, { useState, useEffect } from 'react';
import {
  Bell, Heart, MessageCircle, UserPlus, Calendar,
  Settings, Check, Filter, Repeat, AtSign
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { formatDistanceToNow } from 'date-fns';

type NotificationCategory = 'all' | 'social' | 'events' | 'system';

interface NotificationsPageProps {
  onViewTopic?: (topicId: string) => void;
  onViewProfile?: (userId: string) => void;
  onViewEvent?: (eventId: string) => void;
}

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

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchMyNotifications();
  }, [fetchMyNotifications]);

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
        return <UserPlus className="w-5 h-5 text-blue-600" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case 'event':
      case 'event_reminder':
      case 'event_update':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const combinedNotifications = [
    ...notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      created_at: n.created_at,
      event_id: n.event_id,
      category: n.type.includes('event') ? 'events' : 'system' as NotificationCategory,
      source: 'notification' as const
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
      category: 'social' as NotificationCategory,
      source: 'activity' as const
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredNotifications = combinedNotifications.filter(n => {
    if (activeCategory === 'all') return true;
    return n.category === activeCategory;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loading = notificationsLoading || activitiesLoading;

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
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                  title="Mark all as read"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex space-x-1 overflow-x-auto">
            {(['all', 'social', 'events', 'system'] as NotificationCategory[]).map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No notifications yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {activeCategory === 'all'
                ? "When you get notifications, they'll show up here"
                : `No ${activeCategory} notifications`}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => {
                  if (notification.source === 'notification') {
                    markAsRead(notification.id);
                    if (notification.event_id) {
                      onViewEvent?.(notification.event_id);
                    }
                  } else if (notification.source === 'activity') {
                    if (notification.target_type === 'topic' && notification.target_id) {
                      onViewTopic?.(notification.target_id);
                    }
                  }
                }}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${
                    !notification.is_read
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {notification.message}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {notification.user && (
                          <div
                            className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notification.user_id) {
                                onViewProfile?.(notification.user_id);
                              }
                            }}
                          >
                            {notification.user.avatar_url ? (
                              <img
                                src={notification.user.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                {notification.user.name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-gray-700 dark:text-gray-300">
                          {notification.message}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
