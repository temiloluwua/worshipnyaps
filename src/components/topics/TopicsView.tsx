import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Search, Plus, Sparkles, Users } from 'lucide-react';
import { useTopics } from '../../hooks/useTopics';
import { useAuth } from '../../hooks/useAuth';
import { discussionTopics } from '../../data/topics';
import { TopicCard } from './TopicCard';
import { CreateTopicModal } from './CreateTopicModal';
import { EditTopicModal } from './EditTopicModal';
import { TopicOfTheDayCard } from './TopicOfTheDayCard';
import { AuthModal } from '../auth/AuthModal';
import toast from 'react-hot-toast';

export function TopicsView() {
  const { user, profile } = useAuth();
  const { topics, loading, toggleTopicLike, incrementViewCount } = useTopics();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [likedTopics, setLikedTopics] = useState<Set<string>>(new Set());
  const [bookmarkedTopics, setBookmarkedTopics] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'topics' | 'community'>('topics');
  const [showSearch, setShowSearch] = useState(true);
  const lastScrollY = useRef(0);

  const displayTopicsSource = topics.length > 0 ? topics : discussionTopics;

  const topicsFiltered = displayTopicsSource.filter(
    (topic: any) => (topic.topic_type === 'preselected' || !topic.topic_type)
  );
  const communityTopics = displayTopicsSource.filter(
    (topic: any) => topic.topic_type === 'community'
  );

  const isPinned = (t: any) => Boolean(t && (t.isPinned || t.is_pinned));
  const topicOfTheDay = topicsFiltered.find(isPinned) || topicsFiltered[0];

  const remainingTopics = topicsFiltered.filter(
    (topic) => topic.id !== topicOfTheDay?.id
  );

  const categories = [
    'all',
    ...Array.from(
      new Set(
        (activeTab === 'topics' ? topicsFiltered : communityTopics).map(
          (topic) => topic.category
        )
      )
    ),
  ];

  const currentFeedTopics = activeTab === 'topics' ? remainingTopics : communityTopics;

  const filteredTopics = currentFeedTopics.filter((topic) => {
    const matchesSearch =
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (topic.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayTopics = filteredTopics.length > 0 ? filteredTopics : currentFeedTopics;

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

  const handleLike = (id: string) => {
    if (user) {
      toggleTopicLike(id);
      setLikedTopics((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      setShowAuthModal(true);
    }
  };

  const handleBookmark = (id: string) => {
    if (user) {
      setBookmarkedTopics((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
          toast.success('Removed from bookmarks');
        } else {
          newSet.add(id);
          toast.success('Added to bookmarks');
        }
        return newSet;
      });
    } else {
      setShowAuthModal(true);
    }
  };

  const handleShare = (topic: any) => {
    const shareText = `Check out this discussion topic: "${topic.title}" - ${
      topic.bibleReference || 'Bible Study Discussion'
    }`;
    if (navigator.share) {
      navigator.share({
        title: topic.title,
        text: shareText,
        url: window.location.href,
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success('Topic link copied to clipboard!');
    }
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
                  : category.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'topics' && topicOfTheDay && (
        <div className="p-4">
          <TopicOfTheDayCard
            topic={topicOfTheDay}
            isLiked={likedTopics.has(topicOfTheDay.id)}
            isBookmarked={bookmarkedTopics.has(topicOfTheDay.id)}
            onLike={() => handleLike(topicOfTheDay.id)}
            onBookmark={() => handleBookmark(topicOfTheDay.id)}
            onShare={() => handleShare(topicOfTheDay)}
            onEdit={() => handleEdit(topicOfTheDay)}
            onView={() => incrementViewCount(topicOfTheDay.id)}
          />
        </div>
      )}

      {activeTab === 'topics' ? (
        <div className="p-4">
          <div className="grid gap-6">
            {displayTopics.map((topic, index) => (
              <div
                key={topic.id}
                className="transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideInUp 0.6s ease-out forwards',
                }}
              >
                <TopicCard
                  topic={topic}
                  isLiked={likedTopics.has(topic.id)}
                  isBookmarked={bookmarkedTopics.has(topic.id)}
                  onLike={() => handleLike(topic.id)}
                  onBookmark={() => handleBookmark(topic.id)}
                  onShare={() => handleShare(topic)}
                  onEdit={() => handleEdit(topic)}
                  onView={() => incrementViewCount(topic.id)}
                  cardStyle="game"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {displayTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isLiked={likedTopics.has(topic.id)}
                isBookmarked={bookmarkedTopics.has(topic.id)}
                onLike={() => handleLike(topic.id)}
                onBookmark={() => handleBookmark(topic.id)}
                onShare={() => handleShare(topic)}
                onEdit={() => handleEdit(topic)}
                onView={() => incrementViewCount(topic.id)}
                cardStyle="feed"
              />
            ))}
          </div>
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

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="signin" />

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
