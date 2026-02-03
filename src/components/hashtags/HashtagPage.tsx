import React, { useState, useEffect } from 'react';
import { ArrowLeft, Hash, Bell, BellOff, TrendingUp } from 'lucide-react';
import { useHashtags, Hashtag } from '../../hooks/useHashtags';
import { useLikes } from '../../hooks/useLikes';
import { useBookmarks } from '../../hooks/useBookmarks';
import { Topic } from '../../lib/supabase';
import { TopicCard } from '../topics/TopicCard';

interface HashtagPageProps {
  hashtagName: string;
  onBack: () => void;
  onViewTopic?: (topic: Topic) => void;
  onViewProfile?: (userId: string) => void;
}

export const HashtagPage: React.FC<HashtagPageProps> = ({
  hashtagName,
  onBack,
  onViewTopic,
  onViewProfile
}) => {
  const {
    trendingHashtags,
    isFollowing,
    toggleFollowHashtag,
    fetchTopicsByHashtag
  } = useHashtags();
  const { isLiked, toggleLike, fetchLikeCounts } = useLikes();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const [hashtag, setHashtag] = useState<Hashtag | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHashtagData = async () => {
      setLoading(true);

      const matchingHashtag = trendingHashtags.find(
        h => h.name.toLowerCase() === hashtagName.toLowerCase()
      );

      if (matchingHashtag) {
        setHashtag(matchingHashtag);
      }

      const hashtagTopics = await fetchTopicsByHashtag(hashtagName);
      setTopics(hashtagTopics);

      if (hashtagTopics.length > 0) {
        fetchLikeCounts('topic', hashtagTopics.map(t => t.id));
      }

      setLoading(false);
    };

    loadHashtagData();
  }, [hashtagName, trendingHashtags, fetchTopicsByHashtag, fetchLikeCounts]);

  const handleFollowToggle = async () => {
    if (hashtag) {
      await toggleFollowHashtag(hashtag.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="ml-4 flex-1">
            <div className="flex items-center">
              <Hash className="w-5 h-5 text-blue-600 mr-1" />
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">
                {hashtagName}
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hashtag?.usage_count || topics.length} posts
            </p>
          </div>
          {hashtag && (
            <button
              onClick={handleFollowToggle}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                isFollowing(hashtag.id)
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isFollowing(hashtag.id) ? (
                <span className="flex items-center">
                  <BellOff className="w-4 h-4 mr-1" />
                  Following
                </span>
              ) : (
                <span className="flex items-center">
                  <Bell className="w-4 h-4 mr-1" />
                  Follow
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Hash className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No posts with #{hashtagName} yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Be the first to post with this hashtag!
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {topics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isLiked={isLiked('topic', topic.id)}
                isBookmarked={isBookmarked(topic.id)}
                onLike={() => toggleLike('topic', topic.id)}
                onBookmark={() => toggleBookmark(topic.id)}
                onShare={() => {}}
                onEdit={() => {}}
                onView={() => onViewTopic?.(topic)}
              />
            ))}
          </div>
        )}

        {trendingHashtags.length > 0 && (
          <div className="mt-6 mx-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Related Hashtags
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 p-4">
                {trendingHashtags
                  .filter(h => h.name.toLowerCase() !== hashtagName.toLowerCase())
                  .slice(0, 8)
                  .map(relatedHashtag => (
                    <button
                      key={relatedHashtag.id}
                      onClick={() => {
                        window.location.hash = `#hashtag/${relatedHashtag.name}`;
                      }}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      #{relatedHashtag.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
