import React, { useState, useEffect } from 'react';
import { Heart, ArrowRight, Sun, Moon, ShoppingBag, Bell, Sparkles, MessageCircle, Calendar, Star } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { WaitlistModal } from './WaitlistModal';
import { supabase } from '../../lib/supabase';

interface LandingPageProps {
  onEnter: () => void;
  onPreOrder: () => void;
  onViewEvents?: () => void;
  onViewTopicOfDay?: (topicId: string) => void;
}

interface Topic {
  id: string;
  title: string;
  category: string;
  bible_verse?: string;
  tags: string[];
  content?: string;
}

export function LandingPage({ onEnter, onPreOrder, onViewEvents, onViewTopicOfDay }: LandingPageProps) {
  const { isDark, toggleTheme } = useTheme();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [topicOfTheDay, setTopicOfTheDay] = useState<Topic | null>(null);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const { data, error } = await supabase
          .from('topics')
          .select('id, title, category, bible_verse, tags, content')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const topicList = data || [];
        setAllTopics(topicList);

        if (topicList.length > 0) {
          const today = new Date().toDateString();
          const dateHash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const selectedIndex = dateHash % topicList.length;
          setTopicOfTheDay(topicList[selectedIndex]);
        }
      } catch (error) {
        console.error('Error fetching topics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors overflow-y-auto">
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="fixed top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all z-10"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-500" />
        ) : (
          <Moon className="w-5 h-5 text-slate-600" />
        )}
      </button>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center space-x-3 mb-6">
            <Heart className="w-14 h-14 text-rose-500" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
              Worship & Yapps
            </h1>
          </div>

          <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-200 mb-4 font-medium">
            Calgary's Premier Bible Study Community
          </p>

          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with fellow believers, dive deep into Scripture, and build lasting friendships
            through engaging discussions and community events.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <button
              onClick={onEnter}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg inline-flex items-center space-x-2"
            >
              <span>Enter Community</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onPreOrder}
              className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-lg hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg inline-flex items-center space-x-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Pre-Order Card Game</span>
            </button>
          </div>

          <button
            onClick={() => setShowWaitlist(true)}
            className="px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-white dark:hover:bg-gray-800 transition-all shadow-md inline-flex items-center space-x-2"
          >
            <Bell className="w-4 h-4" />
            <span>Join Waitlist</span>
          </button>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <Star className="w-6 h-6 text-amber-500" />
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
              Topic of the Day
            </h2>
            <Star className="w-6 h-6 text-amber-500" />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Loading topic...</p>
            </div>
          ) : topicOfTheDay ? (
            <div className="max-w-2xl mx-auto">
              <div
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 shadow-2xl border-2 border-amber-400 dark:border-amber-500 hover:shadow-3xl transition-all cursor-pointer transform hover:scale-105"
                onClick={onEnter}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                    <span className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-semibold">
                      {topicOfTheDay.category}
                    </span>
                  </div>
                  <MessageCircle className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
                  {topicOfTheDay.title}
                </h3>
                {topicOfTheDay.bible_verse && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 italic border-l-4 border-amber-500 pl-4">
                    {topicOfTheDay.bible_verse.split(';')[0]}
                  </p>
                )}
                {topicOfTheDay.content && (
                  <p className="text-slate-700 dark:text-slate-200 mb-6 leading-relaxed">
                    {topicOfTheDay.content.substring(0, 200)}...
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-6">
                  {topicOfTheDay.tags && topicOfTheDay.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (topicOfTheDay) {
                      onViewTopicOfDay?.(topicOfTheDay.id);
                    } else {
                      onEnter();
                    }
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all inline-flex items-center justify-center space-x-2"
                >
                  <span>Join Discussion</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-slate-600 dark:text-slate-400 mt-6 text-sm">
                This topic changes daily at midnight UTC
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">No topics available yet</p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-2xl p-8 text-center shadow-xl">
          <Calendar className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-3">
            Join Our Live Events
          </h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Connect in person at our weekly Bible study gatherings, worship nights, and community events throughout Calgary.
          </p>
          <button
            onClick={() => {
              (onViewEvents ?? onEnter)();
            }}
            className="px-8 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-all inline-flex items-center space-x-2"
          >
            <span>View Events</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-12 text-center text-slate-500 dark:text-slate-500 text-sm">
          Based in Calgary, AB
        </p>
      </div>

      <WaitlistModal
        isOpen={showWaitlist}
        onClose={() => setShowWaitlist(false)}
        productType="card_game"
      />
    </div>
  );
}
