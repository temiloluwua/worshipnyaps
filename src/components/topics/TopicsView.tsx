import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Search, Plus, Filter, Star, ExternalLink, Eye, Bookmark, MoreHorizontal, Sparkles, Crown, Edit } from 'lucide-react';
import { useTopics } from '../../hooks/useTopics';
import { useAuth } from '../../hooks/useAuth';
import { discussionTopics } from '../../data/topics';
import { TopicCard } from './TopicCard';
import { CreateTopicModal } from './CreateTopicModal';
import { EditTopicModal } from './EditTopicModal';
import { TopicOfTheDayCard } from './TopicOfTheDayCard';
import toast from 'react-hot-toast';

export function TopicsView() {
  const { user, profile } = useAuth();
  const { topics, loading, toggleTopicLike, incrementViewCount } = useTopics();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [likedTopics, setLikedTopics] = useState<Set<string>>(new Set());
  const [bookmarkedTopics, setBookmarkedTopics] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'feed' | 'cards'>('cards');
  const [isScrolled, setIsScrolled] = useState(false);

  // Use fallback topics if database is empty
  const displayTopicsSource = topics.length > 0 ? topics : discussionTopics;

  // Get topic of the day (featured/pinned topic or most recent)
  const isPinned = (t: any) => Boolean((t && (t.isPinned || t.is_pinned)));
  const topicOfTheDay = displayTopicsSource.find(isPinned) || displayTopicsSource[0];

  // Get remaining topics (excluding topic of the day)
  const remainingTopics = displayTopicsSource.filter(topic => topic.id !== topicOfTheDay?.id);

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(displayTopicsSource.map(topic => topic.category)))];

  // Filter topics based on search and category
  const filteredTopics = remainingTopics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (topic.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayTopics = filteredTopics.length > 0 ? filteredTopics : remainingTopics;

  // Handle scroll to show simplified header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const shouldBeScrolled = scrollTop > 120;
      if (shouldBeScrolled !== isScrolled) {
        setIsScrolled(shouldBeScrolled);
      }
    };

    // Throttle scroll events for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, []);

  const handleLike = (id: string) => {
    if (user) {
      toggleTopicLike(id);
      setLikedTopics(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      toast.error('Please sign in to like topics');
    }
  };

  const handleBookmark = (id: string) => {
    if (user) {
      setBookmarkedTopics(prev => {
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
      toast.error('Please sign in to bookmark topics');
    }
  };

  const handleShare = (topic: any) => {
    const shareText = `Check out this discussion topic: "${topic.title}" - ${topic.bibleReference || 'Bible Study Discussion'}`;
    if (navigator.share) {
      navigator.share({
        title: topic.title,
        text: shareText,
        url: window.location.href
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success('Topic link copied to clipboard!');
    }
  };

  const handleEdit = (topic: any) => {
    if (!user) {
      toast.error('Please sign in to edit topics');
      return;
    }
    
    // Skip editing for sample data
    if (!topic.id || topic.id.length !== 36) {
      toast.error('Cannot edit sample topics. Please create your own topics to edit.');
      return;
    }
    
    // Check if user can edit (author or admin)
    const canEdit = topic.author_id === user.id || 
                   topic.authorId === user.id || 
                   profile?.role === 'admin';
    
    if (!canEdit) {
      toast.error('You can only edit your own topics');
      return;
    }

    setEditingTopic(topic);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading topics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className={`sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-10 transition-all duration-200 ease-out ${
        isScrolled ? 'py-3 px-4 shadow-md' : 'p-4'
      }`}>
        <div className={`transition-all duration-200 ease-out ${
          isScrolled ? 'opacity-0 max-h-0 overflow-hidden mb-0' : 'opacity-100 max-h-32 mb-4'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-yellow-500" />
                Discussion Cards
              </h1>
              <p className="text-gray-600 text-sm">Bible study discussions for our community</p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('feed')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'feed'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Feed
                </button>
              </div>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search - always visible */}
        <div className={`flex items-center space-x-3 ${isScrolled ? 'mb-0' : 'mb-4'}`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={isScrolled ? "Search..." : "Search topics, questions, or tags..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 ${
                isScrolled ? 'py-2' : 'py-3'
              }`}
            />
          </div>
          
          {isScrolled && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Filter - only show when not scrolled */}
        <div className={`transition-all duration-200 ease-out ${
          isScrolled ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-16'
        }`}>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md'
                }`}
              >
                {category === 'all' ? 'All Topics' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Topic of the Day */}
      {topicOfTheDay && (
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

      {/* Topics Display */}
      {viewMode === 'cards' ? (
        /* Card Game Style */
        <div className="p-4">
          <div className="grid gap-6">
            {displayTopics.map((topic, index) => (
              <div
                key={topic.id}
                className="transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideInUp 0.6s ease-out forwards'
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
        /* Twitter Feed Style */
        <div className="bg-white/80 backdrop-blur-sm">
          <div className="divide-y divide-gray-100">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mx-4 shadow-lg">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No topics found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              Create First Topic
            </button>
          </div>
        </div>
      )}

      {/* Create Topic Modal */}
      <CreateTopicModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Edit Topic Modal */}
      <EditTopicModal
        isOpen={showEditModal}
        topic={editingTopic}
        onClose={() => {
          setShowEditModal(false);
          setEditingTopic(null);
        }}
      />

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
