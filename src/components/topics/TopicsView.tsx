import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Search, Plus, Sparkles, Users, Star, Shuffle, Lightbulb, ClipboardList, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTopics } from '../../hooks/useTopics';
import { useCommunityPosts } from '../../hooks/useCommunityPosts';
import { useAuth } from '../../hooks/useAuth';
import { useLikes } from '../../hooks/useLikes';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useConnections } from '../../hooks/useConnections';
import { useFollows } from '../../hooks/useFollows';
import { discussionTopics } from '../../data/topics';
import { TopicCard } from './TopicCard';
import { CreateTopicModal } from './CreateTopicModal';
import { EditTopicModal } from './EditTopicModal';
import { TopicOfTheDayCard } from './TopicOfTheDayCard';
import { TopicDetailModal } from './TopicDetailModal';
import { RequestTopicModal } from './RequestTopicModal';
import { AdminTopicReviewPanel } from './AdminTopicReviewPanel';
import { AuthModal } from '../auth/AuthModal';
import { ShareModal } from '../social/ShareModal';
import { NearbyEventsRail } from './NearbyEventsRail';
import { Topic, CommunityCategory } from '../../lib/supabase';
import toast from 'react-hot-toast';

type CommunitySub = 'all' | CommunityCategory;

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
  onViewShop?: () => void;
  openCreateRequest?: number;
  onOpenEvent?: (eventId: string) => void;
}

export function TopicsView({
  onViewProfile,
  onViewHashtag,
  focusTopicId,
  onFocusedTopicHandled,
  onViewShop,
  openCreateRequest,
  onOpenEvent,
}: TopicsViewProps = {}) {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const { topics, loading, incrementViewCount, fetchTopics } = useTopics();
  const { posts: communityPosts, fetchPosts: fetchCommunityPosts, toggleFeatured } = useCommunityPosts();
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
  const [communitySub, setCommunitySub] = useState<CommunitySub>('all');
  const [viewingTopic, setViewingTopic] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAdminReview, setShowAdminReview] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<'friends' | 'local'>('friends');
  const { connections } = useConnections();
  const { followingIds } = useFollows();
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'admin' || profile?.role === 'moderator';
  const myCity = profile?.city?.trim().toLowerCase();
  const friendIds = new Set((connections || []).map((c: any) => c.connected_user_id));

  const sanitizedSupabaseTopics = topics
    .map(sanitizeTopic)
    .filter(isValidTopic);
  const sanitizedSeedTopics = discussionTopics
    .map(sanitizeTopic)
    .filter(isValidTopic);

  // Pre-existing rows in `topics` may still carry topic_type='community' if
  // the backfill hasn't been run yet; filter them out so they don't bleed
  // into the Topics tab. After the migration runs they won't exist anyway.
  const displayTopicsSource = (
    sanitizedSupabaseTopics.length > 0 ? sanitizedSupabaseTopics : sanitizedSeedTopics
  ).filter((topic: any) => topic.topic_type !== 'community');

  const topicsFiltered = displayTopicsSource;

  // Adapt community_posts rows to the shape TopicCard / list-row code expects.
  const communityTopics = communityPosts
    .map((p) => sanitizeTopic({
      ...p,
      category: p.community_category || 'general',
      topic_type: 'community',
      bibleReference: p.bible_verse,
    }))
    .filter(isValidTopic);

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
    const pool = topicsFiltered.length > 0 ? topicsFiltered : displayTopicsSource;
    if (pool.length === 0) {
      toast('No topics to shuffle yet — check back when there are more.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    handleViewTopic(pool[randomIndex]);
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

  const hasSearchQuery = normalizedQuery.length > 0;
  const shouldShowFeaturedCard = false;
  // Show today's pick at the top of the Topics tab whenever the user is
  // browsing the full feed (not searching, not category-filtering). Same
  // date hash as the landing page so both pages always agree.
  const showTopicOfTheDayCard = Boolean(
    topicOfTheDay && !hasSearchQuery && selectedCategory === 'all' && activeTab === 'topics'
  );
  const showRandomCard = false;

  const featuredExclusions = new Set<string>();

  const primaryTopics = topicsFiltered;
  const communityFiltered = communitySub === 'all'
    ? communityTopics
    : communityTopics.filter((t: any) => t.community_category === communitySub);

  // Community tab respects the Friends / Local audience chip. The "Friends"
  // chip also includes anyone the user follows (one-way) — they only see
  // those authors' public posts, since the friends_only RLS gate already
  // blocks non-connections from seeing private content.
  const friendsOnlyFiltered = user ? communityFiltered.filter((t: any) => {
    const authorId = t.author_id || t.authorId;
    if (authorId === user.id) return true;
    if (audienceFilter === 'friends') {
      return friendIds.has(authorId) || followingIds.has(authorId);
    }
    // 'local' — if the user hasn't set a city, fall back to showing all posts
    // instead of filtering everything out (better than an empty feed)
    if (!myCity) return true;
    const authorCity = (t.users?.city || t.authorCity || '').trim().toLowerCase();
    return authorCity === myCity;
  }) : communityFiltered;

  const currentFeedTopics = activeTab === 'topics' ? primaryTopics : friendsOnlyFiltered;

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

  // Daily seeded shuffle — everyone sees the same order today, and the
  // order rotates at midnight so the feed feels fresh every day.
  const dailySeed = (() => {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  })();

  const seededRandom = (seed: number) => {
    // xmur3 → mulberry32 — deterministic, fast, good distribution
    let h = 2166136261 ^ seed;
    h = Math.imul(h ^ (h >>> 13), 2654435761);
    let t = (h + 0x6D2B79F5) | 0;
    return () => {
      t = (t + 0x6D2B79F5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  const displayTopics = (() => {
    if (hasSearchQuery || selectedCategory !== 'all') return filteredTopics;
    const rng = seededRandom(dailySeed);
    const arr = [...filteredTopics];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Lift the current user's own posts to the top so freshly-created
    // content is immediately visible instead of buried by the shuffle.
    if (user) {
      const mine: any[] = [];
      const rest: any[] = [];
      for (const t of arr) {
        const aid = t.author_id || t.authorId;
        if (aid === user.id) mine.push(t);
        else rest.push(t);
      }
      return [...mine, ...rest];
    }
    return arr;
  })();
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

  // Landing page category chips drop the desired community sub-tab in
  // sessionStorage before navigating into the app. Pick it up once on mount,
  // jump straight to the Community tab with that filter applied, then clear it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('wny_initial_community_sub');
      if (!raw) return;
      sessionStorage.removeItem('wny_initial_community_sub');
      const valid: CommunitySub[] = ['all', 'prayer_point', 'testimony', 'bible_study', 'question', 'general'];
      if ((valid as string[]).includes(raw)) {
        setActiveTab('community');
        setCommunitySub(raw as CommunitySub);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (openCreateRequest && openCreateRequest > 0) {
      if (!user) {
        setShowAuthModal(true);
      } else {
        setActiveTab('community');
        setShowCreateModal(true);
      }
    }
  }, [openCreateRequest, user]);

  useEffect(() => {
    if (topics.length > 0) {
      fetchLikeCounts('topic', topics.map(t => t.id));
    }
  }, [topics, fetchLikeCounts]);

  useEffect(() => {
    if (communityPosts.length > 0) {
      fetchLikeCounts('community_post', communityPosts.map(p => p.id));
    }
  }, [communityPosts, fetchLikeCounts]);

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

  const currentLikeType: 'topic' | 'community_post' =
    activeTab === 'community' ? 'community_post' : 'topic';

  const handleLike = (id: string) => {
    if (user) {
      toggleLike(currentLikeType, id);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleBookmark = (id: string) => {
    if (user) {
      toggleBookmark(id, currentLikeType);
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
    // Logged-out users can open the modal and fill it out — the auth gate
    // moves to submit time so people don't feel ambushed by a sign-in wall.
    setShowCreateModal(true);
  };

  const handleViewTopic = (topic: any) => {
    incrementViewCount(topic.id);
    setViewingTopic(topic);
    setShowDetailModal(true);
  };

  const handleRequestTopic = () => {
    if (!user) { setShowAuthModal(true); return; }
    setShowRequestModal(true);
  };

  const handleShowMoreTopics = () => {
    setVisibleCount((prev) => prev + DEFAULT_VISIBLE_TOPICS);
  };

  const communitySubTabs: { key: CommunitySub; label: string }[] = [
    { key: 'all', label: t('communityTabs.all') },
    { key: 'prayer_point', label: t('communityTabs.prayerPoints') },
    { key: 'testimony', label: t('communityTabs.testimonies') },
    { key: 'bible_study', label: t('communityTabs.bibleStudy') },
    { key: 'question', label: t('communityTabs.questions') },
    { key: 'general', label: t('communityTabs.general') },
  ];

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
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
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
                <>
                  <button
                    onClick={handleRequestTopic}
                    className="bg-gradient-to-r from-teal-500 to-green-500 text-white p-2 rounded-full hover:from-teal-600 hover:to-green-600 transition-all shadow-lg"
                    aria-label={t('topicRequest.submitRequest')}
                    title={t('topicRequest.submitRequest')}
                  >
                    <Lightbulb className="w-5 h-5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAdminReview(true)}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-2 rounded-full hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg"
                      aria-label={t('adminReview.title')}
                      title={t('adminReview.title')}
                    >
                      <ClipboardList className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={pickRandomTopic}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                    aria-label="Pick random topic"
                    title="Pick a random topic"
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                </>
              )}
              {activeTab === 'community' && (
                <button
                  onClick={handleCreateTopic}
                  className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-2 rounded-full hover:from-blue-700 hover:to-teal-700 transition-all shadow-lg"
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

          {activeTab === 'community' && (
            <div className="space-y-3">
              <div className="flex space-x-1 overflow-x-auto pb-3 scrollbar-hide">
                {communitySubTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setCommunitySub(tab.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      communitySub === tab.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setAudienceFilter('friends')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    audienceFilter === 'friends'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Friends
                </button>
                <button
                  onClick={() => setAudienceFilter('local')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    audienceFilter === 'local'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title={myCity ? `Posts from people in ${profile?.city}` : 'Set your city in your profile'}
                >
                  {profile?.city || 'Local'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {activeTab === 'topics' ? (
        <div className="p-4">
          {showTopicOfTheDayCard && topicOfTheDay && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Topic of the Day
                </h2>
              </div>
              <TopicOfTheDayCard
                topic={{
                  ...topicOfTheDay,
                  likes: getLikeCount('topic', topicOfTheDay.id),
                }}
                isLiked={isLiked('topic', topicOfTheDay.id)}
                isBookmarked={isBookmarked(topicOfTheDay.id)}
                onLike={() => handleLike(topicOfTheDay.id)}
                onBookmark={() => handleBookmark(topicOfTheDay.id)}
                onShare={() => handleShare(topicOfTheDay)}
                onEdit={() => handleEdit(topicOfTheDay)}
                onView={() => handleViewTopic(topicOfTheDay)}
                frameTone="gold"
              />
            </div>
          )}
          {visibleTopics.length > 0 ? (
            <div className="grid gap-6">
              {visibleTopics.map((topic, index) => {
                const isHighlighted = highlightedTopicId === topic.id;
                return (
                  <div
                    key={topic.id}
                    data-topic-card={topic.id}
                    className={`transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 relative ${
                      isHighlighted ? 'ring-4 ring-blue-400 dark:ring-blue-500 rounded-2xl shadow-2xl' : ''
                    }`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'slideInUp 0.6s ease-out forwards',
                    }}
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
                      onView={() => handleViewTopic(topic)}
                      onViewProfile={onViewProfile}
                      cardStyle="game"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-6 max-w-md mx-auto">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">No topics match your search</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Try a different keyword or browse all topics.</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <NearbyEventsRail onOpenEvent={onOpenEvent} />
          {visibleTopics.length > 0 ? (
            visibleTopics.map((topic) => (
              <div
                key={topic.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-l-4 border-transparent hover:border-blue-500"
                onClick={() => handleViewTopic(topic)}
              >
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">{topic.authorName}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">@{topic.authorName?.toLowerCase().replace(/\s/g, '')}</span>
                      {topic.is_featured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                          <Sparkles className="w-3 h-3" /> Featured
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>{topic.title}</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-3" style={{ fontFamily: 'Georgia, serif' }}>{topic.content || topic.description}</p>
                    {topic.tags && topic.tags.length > 0 && (
                      <div className="flex gap-1 mb-3 flex-wrap">
                        {topic.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-6 text-xs text-gray-500 dark:text-gray-400">
                      {/* Prayer requests get a praying-hands react instead of a heart. */}
                      {topic.community_category === 'prayer_point' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLike(topic.id); }}
                          className={`hover:text-amber-600 dark:hover:text-amber-400 transition-colors ${isLiked('community_post', topic.id) ? 'text-amber-600 dark:text-amber-400' : ''}`}
                          title={isLiked('community_post', topic.id) ? 'You prayed for this' : 'Praying for you'}
                        >
                          <span className="text-base inline-block mr-1 align-middle">🙏</span>
                          {getLikeCount('community_post', topic.id)}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLike(topic.id); }}
                          className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${isLiked('community_post', topic.id) ? 'text-red-600 dark:text-red-400' : ''}`}
                        >
                          <Heart className={`w-4 h-4 inline mr-1 ${isLiked('community_post', topic.id) ? 'fill-current' : ''}`} />
                          {getLikeCount('community_post', topic.id)}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBookmark(topic.id); }}
                        className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${isBookmarked(topic.id) ? 'text-yellow-600 dark:text-yellow-400' : ''}`}
                      >
                        <Star className={`w-4 h-4 inline mr-1 ${isBookmarked(topic.id) ? 'fill-current' : ''}`} />
                        Save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(topic); }}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Share2 className="w-4 h-4 inline mr-1" />
                        Share
                      </button>
                      {isStaff && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFeatured(topic.id, !topic.is_featured); }}
                          className={`hover:text-amber-600 dark:hover:text-amber-400 transition-colors ${topic.is_featured ? 'text-amber-600 dark:text-amber-400' : ''}`}
                          title={topic.is_featured ? 'Remove from Search Featured' : 'Feature on Search'}
                        >
                          <Sparkles className={`w-4 h-4 inline mr-1 ${topic.is_featured ? 'fill-current' : ''}`} />
                          {topic.is_featured ? 'Featured' : 'Feature'}
                        </button>
                      )}
                      {topic.comment_count && (
                        <span>
                          <MessageCircle className="w-4 h-4 inline mr-1" />
                          {topic.comment_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 px-4">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No community posts yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Posts from friends and mutuals will appear here</p>
              <button
                onClick={handleCreateTopic}
                className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-full hover:from-blue-700 hover:to-teal-700 transition-colors font-semibold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create a Post
              </button>
            </div>
          )}
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
        onRequireAuth={() => setShowAuthModal(true)}
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

      {viewingTopic && (() => {
        const viewLikeType: 'topic' | 'community_post' =
          viewingTopic.topic_type === 'community' ? 'community_post' : 'topic';
        return (
          <TopicDetailModal
            topic={{ ...viewingTopic, likes: getLikeCount(viewLikeType, viewingTopic.id) }}
            isOpen={showDetailModal}
            onClose={() => { setShowDetailModal(false); setViewingTopic(null); }}
            isLiked={isLiked(viewLikeType, viewingTopic.id)}
            isBookmarked={isBookmarked(viewingTopic.id)}
            onLike={() => {
              if (user) toggleLike(viewLikeType, viewingTopic.id);
              else setShowAuthModal(true);
            }}
            onBookmark={() => {
              if (user) toggleBookmark(viewingTopic.id, viewLikeType);
              else setShowAuthModal(true);
            }}
            onShare={() => handleShare(viewingTopic)}
            onEdit={() => handleEdit(viewingTopic)}
            onDeleted={() => {
              if (viewingTopic.topic_type === 'community') fetchCommunityPosts();
              else fetchTopics();
            }}
          />
        );
      })()}

      <RequestTopicModal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} />
      <AdminTopicReviewPanel isOpen={showAdminReview} onClose={() => setShowAdminReview(false)} />

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
