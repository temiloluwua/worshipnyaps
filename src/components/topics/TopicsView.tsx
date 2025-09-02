import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Search, Plus, Filter, Star, ExternalLink, Eye } from 'lucide-react';
import { useTopics } from '../../hooks/useTopics';
import { useAuth } from '../../hooks/useAuth';
import { FullScreenCard } from './FullScreenCard';
import { discussionTopics } from '../../data/topics';
import toast from 'react-hot-toast';

export function TopicsView() {
  const { user } = useAuth();
  const { topics, loading, toggleTopicLike, incrementViewCount } = useTopics();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [topicOfTheDay, setTopicOfTheDay] = useState<any>(null);
  const [likedTopics, setLikedTopics] = useState<Set<string>>(new Set());

  // Use fallback topics if database is empty
  const displayTopicsSource = topics.length > 0 ? topics : discussionTopics;

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(displayTopicsSource.map(topic => topic.category)))];

  // Set topic of the day (changes daily)
  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('topicOfTheDayDate');
    const savedTopic = localStorage.getItem('topicOfTheDay');
    
    if (savedDate !== today || !savedTopic || displayTopicsSource.length === 0) {
      const randomIndex = Math.floor(Math.random() * displayTopicsSource.length);
      const todaysTopic = displayTopicsSource[randomIndex];
      setTopicOfTheDay(todaysTopic);
      localStorage.setItem('topicOfTheDayDate', today);
      localStorage.setItem('topicOfTheDay', JSON.stringify(todaysTopic));
    } else {
      setTopicOfTheDay(JSON.parse(savedTopic));
    }
  }, [displayTopicsSource]);

  // Filter topics based on search and category
  const filteredTopics = displayTopicsSource.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (topic.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayTopics = filteredTopics.length > 0 ? filteredTopics : displayTopicsSource;
  const currentTopic = displayTopics[currentIndex] || displayTopicsSource[0];

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

  const nextTopic = () => {
    setCurrentIndex((prev) => (prev + 1) % displayTopics.length);
  };

  const prevTopic = () => {
    setCurrentIndex((prev) => (prev - 1 + displayTopics.length) % displayTopics.length);
  };

  // Reset current index when filters change
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery, selectedCategory]);

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

  if (!currentTopic) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">No topics available</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Discussion Topics</h1>
        <p className="text-gray-600">Swipe through thought-provoking questions for Bible study and fellowship</p>
      </div>

      {/* Topic of the Day */}
      {topicOfTheDay && (
        <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            <h3 className="font-semibold text-gray-800">Topic of the Day</h3>
          </div>
          <p className="text-sm text-gray-700 font-medium">{topicOfTheDay.title}</p>
          <button 
            onClick={() => {
              const topicIndex = displayTopics.findIndex(t => t.id === topicOfTheDay.id);
              if (topicIndex !== -1) {
                setCurrentIndex(topicIndex);
                setShowFullScreen(true);
              }
            }}
            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
          >
            View Topic →
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search topics, questions, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'All Topics' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {filteredTopics.length === 0 && searchQuery && (
          <div className="text-center py-4">
            <p className="text-gray-500">No topics found matching "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Topic Card Preview */}
      <div className="relative mb-6">
        <div 
          className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setShowFullScreen(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {currentTopic.category.replace('-', ' ').toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} of {displayTopics.length}
            </span>
          </div>
          
          <h2 className="text-lg font-semibold text-gray-800 mb-4 leading-relaxed">
            {currentTopic.title}
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-gray-600 mb-1">Category:</p>
            <p className="text-sm text-gray-800">{currentTopic.category}</p>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-gray-700">Content:</p>
            <div className="max-h-24 overflow-hidden">
              <p className="text-xs text-gray-600">{(currentTopic.content || (currentTopic.questions ? currentTopic.questions.join(' ') : '')).substring(0, 200)}...</p>
            </div>
          </div>

          <div className="flex items-center justify-center pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-blue-600">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Tap to view full card</span>
            </div>
          </div>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center mt-4 space-x-2">
          {displayTopics.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <button 
          onClick={() => user ? toast.success('Ask a Question feature coming soon!') : toast.error('Please sign in to ask questions')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Ask a Question</span>
        </button>
        
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.open('https://www.openbible.info', '_blank');
            }
          }}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
        >
          <ExternalLink className="w-5 h-5" />
          <span>Bible Resources</span>
        </button>
      </div>

      {/* Full Screen Card */}
      {showFullScreen && (
        <FullScreenCard
          topic={currentTopic}
          currentIndex={currentIndex}
          totalTopics={displayTopics.length}
          onClose={() => setShowFullScreen(false)}
          onNext={nextTopic}
          onPrevious={prevTopic}
          onLike={handleLike}
          isLiked={likedTopics.has(currentTopic.id)}
          onView={() => incrementViewCount(currentTopic.id)}
        />
      )}
    </div>
  );
}