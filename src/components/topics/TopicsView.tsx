import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Search, Plus, Sparkles, Users, Star, Shuffle } from 'lucide-react';
import { useTopics } from '../../hooks/useTopics';
import { useAuth } from '../../hooks/useAuth';
import { useLikes } from '../../hooks/useLikes';
import { useBookmarks } from '../../hooks/useBookmarks';
import { discussionTopics } from '../../data/topics';
import { TopicCard } from './TopicCard';
import { CreateTopicModal } from './CreateTopicModal';
import { EditTopicModal } from './EditTopicModal';
import { TopicOfTheDayCard } from './TopicOfTheDayCard';
import { AuthModal } from '../auth/AuthModal';
import { ShareModal } from '../social/ShareModal';
import { Topic } from '../../lib/supabase';
import toast from 'react-hot-toast';

const DEFAULT_VISIBLE_TOPICS = 6;
const TOPIC_REFRESH_TICK_MS = 1000;

const formatTimeUntilNextTopic = () => {
  const now = new Date();
  const nextRefresh = new Date(now);
  nextRefresh.setHours(24, 0, 0, 0);
  const diffMs = Math.max(nextRefresh.getTime() - now.getTime(), 0);

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const sanitizeTopic = (topic: any) => {
  const title = typeof topic.title === 'string' ? topic.title.trim() : '';
  const content = typeof topic.content === 'string' ? topic.content.trim() : '';
  const category = typeof topic.category === 'string' ? topic.category.trim() : '';
  const tags = Array.isArray(topic.tags)
    ? topic.tags.filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
    : [];
  const questions = Array.isArray(topic.questions)
    ? topic.questions.filter((question: any) => typeof question === 'string' && question.trim().length > 0)
    : [];
  const hasReadableContent = Boolean(title || content || questions.length || tags.length);
  const commentCount =
    typeof topic.comment_count === 'number'
      ? topic.comment_count
      : typeof topic.comments === 'number'
        ? topic.comments
        : Array.isArray(topic.comments)
          ? topic.comments.length
          : 0;

  if (!hasReadableContent) {
    return null;
  }

  return {
    ...topic,
    title: title || 'Untitled Topic',
    content,
    category: category || 'general',
    tags,
    questions,
    bibleReference: topic.bibleReference || topic.bible_reference || '',
    likes:
      typeof topic.likes === 'number'
        ? topic.likes
        : typeof topic.like_count === 'number'
          ? topic.like_count
          : 0,
    view_count:
      typeof topic.view_count === 'number'
        ? topic.view_count
        : typeof topic.views === 'number'
          ? topic.views
          : 0,
    commentCount,
    authorName: topic.authorName || topic.users?.name || 'Anonymous',
  };
};

const isValidTopic = (
  topic: ReturnType<typeof sanitizeTopic>
): topic is NonNullable<ReturnType<typeof sanitizeTopic>> => Boolean(topic);

interface TopicsViewProps {
  onViewProfile?: (userId: string) => void;
  onViewHashtag?: (hashtagName: string) => void;
  focusTopicId?: string | null;
  onFocusedTopicHandled?: () => void;
}

export function TopicsView({
  onViewProfile,
  onViewHashtag,
  focusTopicId,
  onFocusedTopicHandled,
}: TopicsViewProps = {}) {
  const { user, profile } = useAuth();
  const { topics, loading, incrementViewCount } = useTopics();
  const { isLiked, toggleLike, fetchLikeCounts, getLikeCount } = useLikes();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingTopic, setSharingTopic] = useState<Topic | null>(null);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'community'>('topics');
  const [showSearch, setShowSearch] = useState(true);
  const [randomTopic, setRandomTopic] = useState<Topic | null>(null);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_TOPICS);
  const lastScrollY = useRef(0);
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);
  const [topicRefreshCountdown, setTopicRefreshCountdown] = useState(formatTimeUntilNextTopic);

  const sanitizedSupabaseTopics = topics
    .map(sanitizeTopic)
    .filter(isValidTopic);
  const sanitizedSeedTopics = discussionTopics
    .map(sanitizeTopic)
    .filter(isValidTopic);

  const displayTopicsSource =
    sanitizedSupabaseTopics.length > 0 ? sanitizedSupabaseTopics : sanitizedSeedTopics;

  const topicsFiltered = displayTopicsSource.filter(
    (topic: any) => (topic.topic_type === 'preselected' || !topic.topic_type)
  );
  const communityTopics = displayTopicsSource.filter(
    (topic: any) => topic.topic_type === 'community'
  );

  const topicOfDaySource =
    topics.length > 0
      ? [...topics].sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
      : topicsFiltered;

  const getTopicOfTheDay = () => {
    if (topicOfDaySource.length === 0) return null;
    const today = new Date().toDateString();
    const dateHash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedIndex = dateHash % topicOfDaySource.length;
    const selectedTopic = topicOfDaySource[selectedIndex];
    return sanitizeTopic(selectedTopic) || selectedTopic;
  };

  const topicOfTheDay = getTopicOfTheDay();

  const pickRandomTopic = () => {
    if (topicsFiltered.length > 0) {
      const randomIndex = Math.floor(Math.random() * topicsFiltered.length);
      setRandomTopic(topicsFiltered[randomIndex] as Topic);
    }
  };

  const categories = [
    'all',
    ...Array.from(
      new Set(
        (activeTab === 'topics' ? topicsFiltered : communityTopics)
          .map((topic) => topic.category)
          .filter((category) => typeof category === 'string' && category.trim().length > 0)
      )
    ),
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const shouldShowFeaturedCard =
    activeTab === 'topics' && selectedCategory === 'all' && normalizedQuery.length === 0;
  const showTopicOfTheDayCard = shouldShowFeaturedCard && Boolean(topicOfTheDay);
  const showRandomCard = shouldShowFeaturedCard && Boolean(randomTopic);

  const featuredExclusions = new Set<string>();
  if (showTopicOfTheDayCard && topicOfTheDay?.id) {
    featuredExclusions.add(topicOfTheDay.id);
  }
  if (showRandomCard && randomTopic?.id) {
    featuredExclusions.add(randomTopic.id);
  }

  const primaryTopics = topicsFiltered.filter((topic) => !featuredExclusions.has(topic.id));
  const currentFeedTopics = activeTab === 'topics' ? primaryTopics : communityTopics;

  const filteredTopics = currentFeedTopics.filter((topic) => {
    const title = (topic.title ?? '').toLowerCase();
    const content = (topic.content ?? '').toLowerCase();
    const tags = Array.isArray(topic.tags) ? (topic.tags as string[]) : [];

    const matchesSearch =
      title.includes(normalizedQuery) ||
      content.includes(normalizedQuery) ||
      tags.some((tag: string) => (tag ?? '').toLowerCase().includes(normalizedQuery));
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayTopics = filteredTopics.length > 0 ? filteredTopics : currentFeedTopics;
  const visibleTopics = displayTopics.slice(0, visibleCount);
  const hasMoreTopics = displayTopics.length > visibleTopics.length;

  useEffect(() => {
    setVisibleCount(DEFAULT_VISIBLE_TOPICS);
  }, [activeTab, selectedCategory, searchQuery, displayTopicsSource.length]);

  useEffect(() => {
    if (!shouldShowFeaturedCard && randomTopic) {
      setRandomTopic(null);
    }
  }, [shouldShowFeaturedCard, randomTopic]);

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setTopicRefreshCountdown(formatTimeUntilNextTopic());
    }, TOPIC_REFRESH_TICK_MS);

    return () => window.clearInterval(countdownTimer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowSearch(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowSearch(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (topics.length > 0) {
      fetchLikeCounts('topic', topics.map(t => t.id));
    }
  }, [topics, fetchLikeCounts]);

  useEffect(() => {
    if (!focusTopicId || typeof window === 'undefined' || typeof document === 'undefined') return;

    setActiveTab('topics');
    setSearchQuery('');
    setSelectedCategory('all');
    setRandomTopic(null);

    const topicIndex = topicsFiltered.findIndex((topic) => topic.id === focusTopicId);
    if (topicIndex !== -1) {
      setVisibleCount((prev) => Math.max(prev, topicIndex + 1));
    }

    setHighlightedTopicId(focusTopicId);

    const scrollTimeout = window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(`[data-topic-card=\"${focusTopicId}\"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);

    const clearHighlight = window.setTimeout(() => {
      setHighlightedTopicId(null);
    }, 6000);

    onFocusedTopicHandled?.();

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(clearHighlight);
    };
  }, [focusTopicId, topicsFiltered, onFocusedTopicHandled]);

  const handleLike = (id: string) => {
    if (user) {
      toggleLike('topic', id);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleBookmark = (id: string) => {
    if (user) {
      toggleBookmark(id);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleShare = (topic: any) => {
    setSharingTopic(topic);
    setShowShareModal(true);
  };

  const handleEdit = (topic: any) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const canEdit =
      topic.author_id === user.id || topic.authorId === user.id || profile?.role === 'admin';

    if (!canEdit) {
      toast.error('You can only edit your own topics');
      return;
    }

    setEditingTopic(topic);
    setShowEditModal(true);
  };

  const handleCreateTopic = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleShowMoreTopics = () => {
    setVisibleCount((prev) => prev + DEFAULT_VISIBLE_TOPICS);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading topics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 min-h-screen">
      <div
        className={`sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 z-10 transition-all duration-300 ease-in-out ${
          showSearch ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                {activeTab === 'topics' ? (
                  <>
                    <Sparkles className="w-6 h-6 mr-2 text-yellow-500" />
                    Discussion Cards
                  </>
                ) : (
                  <>
                    <Users className="w-6 h-6 mr-2 text-blue-500" />
                    Community Feed
                  </>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {activeTab === 'topics'
                  ? 'Bible study discussions for our community'
                  : 'Share your thoughts and questions with the community'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'topics' && (
                <button
                  onClick={pickRandomTopic}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                  aria-label="Pick random topic"
                  title="Pick a random topic"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
              )}
              {activeTab === 'community' && (
                <button
                  onClick={handleCreateTopic}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                  aria-label="Create new post"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex space-x-2 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => {
                setActiveTab('topics');
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'topics'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-1" />
              Topics
            </button>
            <button
              onClick={() => {
                setActiveTab('community');
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'community'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1" />
              Community
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search topics, questions, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md'
                }`}
              >
                {category === 'all'
                  ? 'All Topics'
                  : category.replace('-', ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showTopicOfTheDayCard && topicOfTheDay && (
        <div className="p-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Topic of the Day</span>
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div
            className={`rounded-[1.4rem] bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 p-[2px] transition-shadow ${
              highlightedTopicId === topicOfTheDay.id ? 'ring-4 ring-blue-400 dark:ring-blue-500 shadow-2xl' : 'shadow-lg'
            }`}
          >
            <div className="rounded-[1.25rem] bg-gradient-to-br from-blue-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-2">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-xs font-semibold tracking-wide uppercase text-amber-700 dark:text-amber-300">
                  Featured on Landing
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Next topic in: {topicRefreshCountdown}
                </span>
              </div>
              <div data-topic-card={topicOfTheDay.id} className="rounded-2xl overflow-hidden">
                <TopicOfTheDayCard
                  topic={{
                    ...topicOfTheDay,
                    likes: getLikeCount('topic', topicOfTheDay.id)
                  }}
                  isLiked={isLiked('topic', topicOfTheDay.id)}
                  isBookmarked={isBookmarked(topicOfTheDay.id)}
                  onLike={() => handleLike(topicOfTheDay.id)}
                  onBookmark={() => handleBookmark(topicOfTheDay.id)}
                  onShare={() => handleShare(topicOfTheDay)}
                  onEdit={() => handleEdit(topicOfTheDay)}
                  onView={() => incrementViewCount(topicOfTheDay.id)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showRandomCard && randomTopic && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Random Pick</span>
            </div>
            <button
              onClick={() => setRandomTopic(null)}
              className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
          <div
            data-topic-card={randomTopic.id}
            className={`rounded-2xl transition-shadow ${
              highlightedTopicId === randomTopic.id ? 'ring-4 ring-blue-400 dark:ring-blue-500 shadow-2xl' : ''
            }`}
          >
            <TopicOfTheDayCard
              topic={{
                ...randomTopic,
                likes: getLikeCount('topic', randomTopic.id)
              }}
              isLiked={isLiked('topic', randomTopic.id)}
              isBookmarked={isBookmarked(randomTopic.id)}
              onLike={() => handleLike(randomTopic.id)}
              onBookmark={() => handleBookmark(randomTopic.id)}
              onShare={() => handleShare(randomTopic)}
              onEdit={() => handleEdit(randomTopic)}
              onView={() => incrementViewCount(randomTopic.id)}
            />
          </div>
        </div>
      )}

      {activeTab === 'topics' ? (
        <div className="p-4">
          <div className="grid gap-6">
            {visibleTopics.map((topic, index) => {
              const isTopicOfDay = topicOfTheDay?.id === topic.id;
              const isHighlighted = highlightedTopicId === topic.id;
              return (
                <div
                  key={topic.id}
                  data-topic-card={topic.id}
                  className={`transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 relative ${
                    isTopicOfDay ? 'ring-2 ring-amber-400 dark:ring-amber-500 rounded-2xl' : ''
                  } ${isHighlighted ? 'ring-4 ring-blue-400 dark:ring-blue-500 rounded-2xl shadow-2xl' : ''}`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'slideInUp 0.6s ease-out forwards',
                  }}
                >
                  {isTopicOfDay && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                      <Star className="w-3 h-3 fill-white" />
                      Today
                    </div>
                  )}
                  <TopicCard
                    topic={{
                      ...topic,
                      likes: getLikeCount('topic', topic.id)
                    }}
                    isLiked={isLiked('topic', topic.id)}
                    isBookmarked={isBookmarked(topic.id)}
                    onLike={() => handleLike(topic.id)}
                    onBookmark={() => handleBookmark(topic.id)}
                    onShare={() => handleShare(topic)}
                    onEdit={() => handleEdit(topic)}
                    onView={() => incrementViewCount(topic.id)}
                    cardStyle="game"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {visibleTopics.map((topic) => (
              <div
                key={topic.id}
                data-topic-card={topic.id}
                className={`relative ${highlightedTopicId === topic.id ? 'ring-4 ring-blue-400 dark:ring-blue-500 rounded-2xl shadow-2xl m-2' : ''}`}
              >
                <TopicCard
                  topic={{
                    ...topic,
                    likes: getLikeCount('topic', topic.id)
                  }}
                  isLiked={isLiked('topic', topic.id)}
                  isBookmarked={isBookmarked(topic.id)}
                  onLike={() => handleLike(topic.id)}
                  onBookmark={() => handleBookmark(topic.id)}
                  onShare={() => handleShare(topic)}
                  onEdit={() => handleEdit(topic)}
                  onView={() => incrementViewCount(topic.id)}
                  cardStyle="feed"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMoreTopics && (
        <div className="flex justify-center py-6 px-4">
          <button
            onClick={handleShowMoreTopics}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Show more topics
          </button>
        </div>
      )}

      {displayTopics.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 mx-4 shadow-lg">
            <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {activeTab === 'topics'
                ? 'No topics found'
                : 'No community posts yet'}
            </p>
            {activeTab === 'community' && (
              <button
                onClick={handleCreateTopic}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                Create First Post
              </button>
            )}
          </div>
        </div>
      )}

      <CreateTopicModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        topicType={activeTab === 'topics' ? 'preselected' : 'community'}
      />

      <EditTopicModal
        isOpen={showEditModal}
        topic={editingTopic}
        onClose={() => {
          setShowEditModal(false);
          setEditingTopic(null);
        }}
      />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />

      {showShareModal && sharingTopic && (
        <ShareModal
          topic={sharingTopic}
          onClose={() => {
            setShowShareModal(false);
            setSharingTopic(null);
          }}
        />
      )}

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
