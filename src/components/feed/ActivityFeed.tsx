import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Repeat, UserPlus, AtSign, FileText, TrendingUp, Users } from 'lucide-react';
import { useActivityFeed, ActivityItem } from '../../hooks/useActivityFeed';
import { useHashtags } from '../../hooks/useHashtags';
import { useSearch } from '../../hooks/useSearch';
import { formatDistanceToNow } from 'date-fns';
import { ProfileCard } from '../profile/ProfileCard';

interface ActivityFeedProps {
  onViewTopic?: (topicId: string) => void;
  onViewProfile?: (userId: string) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  onViewTopic,
  onViewProfile
}) => {
  const {
    activities,
    loading,
    hasMore,
    fetchFriendActivities,
    getActivityMessage
  } = useActivityFeed();
  const { trendingHashtags } = useHashtags();
  const { suggestedUsers, fetchSuggestedUsers } = useSearch();

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchSuggestedUsers();
  }, [fetchSuggestedUsers]);

  const loadMore = useCallback(() => {
    const newOffset = offset + 20;
    setOffset(newOffset);
    fetchFriendActivities(20, newOffset);
  }, [offset, fetchFriendActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'repost':
        return <Repeat className="w-4 h-4 text-green-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-purple-500" />;
      case 'post':
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <Heart className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 py-6">
      <div className="lg:col-span-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Activity
        </h2>

        {loading && activities.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No activity yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Connect with others to see their activity here
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (activity.target_type === 'topic' && activity.target_id) {
                    onViewTopic?.(activity.target_id);
                  }
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProfile?.(activity.user_id);
                      }}
                    >
                      {activity.user?.avatar_url ? (
                        <img
                          src={activity.user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {activity.user?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {getActivityIcon(activity.activity_type)}
                      <p className="text-sm text-gray-900 dark:text-white">
                        {getActivityMessage(activity)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="p-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-2 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {trendingHashtags.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Trending
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {trendingHashtags.slice(0, 5).map((hashtag, idx) => (
                <button
                  key={hashtag.id}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {idx + 1} · Trending
                  </p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    #{hashtag.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hashtag.usage_count} posts
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestedUsers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Who to follow
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {suggestedUsers.slice(0, 3).map(user => (
                <ProfileCard
                  key={user.id}
                  user={user}
                  compact
                  onViewProfile={() => onViewProfile?.(user.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
