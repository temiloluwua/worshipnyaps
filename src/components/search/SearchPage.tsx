import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Users, Hash, FileText, TrendingUp } from 'lucide-react';
import { useSearch, SearchTab } from '../../hooks/useSearch';
import { useHashtags } from '../../hooks/useHashtags';
import { ProfileCard } from '../profile/ProfileCard';
import { TopicCard } from '../topics/TopicCard';
import { useLikes } from '../../hooks/useLikes';
import { useBookmarks } from '../../hooks/useBookmarks';
import { Topic } from '../../lib/supabase';

interface SearchPageProps {
  onViewProfile?: (userId: string) => void;
  onViewTopic?: (topic: Topic) => void;
  onViewHashtag?: (hashtag: string) => void;
  onStartChat?: (userId: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  onViewProfile,
  onViewTopic,
  onViewHashtag,
  onStartChat
}) => {
  const {
    query,
    results,
    loading,
    suggestedUsers,
    search,
    fetchSuggestedUsers,
    clearResults
  } = useSearch();
  const { trendingHashtags, fetchTrendingHashtags } = useHashtags();
  const { isLiked, toggleLike } = useLikes();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSuggestedUsers();
    fetchTrendingHashtags();
  }, [fetchSuggestedUsers, fetchTrendingHashtags]);

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      if (value.trim()) {
        search(value, activeTab);
      } else {
        clearResults();
      }
    }, 300);

    setDebounceTimer(timer);
  }, [activeTab, search, clearResults, debounceTimer]);

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    if (searchInput.trim()) {
      search(searchInput, tab);
    }
  };

  const hasResults = results.people.length > 0 || results.topics.length > 0 || results.hashtags.length > 0;
  const showInitialState = !searchInput.trim() && !loading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search people, topics, hashtags..."
              className="w-full pl-12 pr-10 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  clearResults();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {searchInput.trim() && (
            <div className="flex space-x-1 mt-3 overflow-x-auto">
              {(['all', 'people', 'topics', 'hashtags'] as SearchTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && searchInput.trim() && !hasResults && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No results found for "{searchInput}"
            </p>
          </div>
        )}

        {!loading && hasResults && (
          <div className="space-y-8">
            {(activeTab === 'all' || activeTab === 'people') && results.people.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    People
                  </h2>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.people.map(person => (
                    <ProfileCard
                      key={person.id}
                      user={person}
                      compact
                      onViewProfile={() => onViewProfile?.(person.id)}
                      onStartChat={() => onStartChat?.(person.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'topics') && results.topics.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Topics
                  </h2>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.topics.map(topic => (
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
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'hashtags') && results.hashtags.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Hash className="w-5 h-5 mr-2" />
                    Hashtags
                  </h2>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.hashtags.map(hashtag => (
                    <button
                      key={hashtag.id}
                      onClick={() => onViewHashtag?.(hashtag.name)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            #{hashtag.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {hashtag.usage_count} posts
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {showInitialState && (
          <div className="space-y-8">
            {trendingHashtags.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Trending Hashtags
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {trendingHashtags.slice(0, 5).map((hashtag, idx) => (
                    <button
                      key={hashtag.id}
                      onClick={() => onViewHashtag?.(hashtag.name)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-400 dark:text-gray-500 font-medium w-4">
                          {idx + 1}
                        </span>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            #{hashtag.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {hashtag.usage_count} posts
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {suggestedUsers.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  People You May Know
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {suggestedUsers.map(user => (
                    <ProfileCard
                      key={user.id}
                      user={user}
                      onViewProfile={() => onViewProfile?.(user.id)}
                      onStartChat={() => onStartChat?.(user.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
