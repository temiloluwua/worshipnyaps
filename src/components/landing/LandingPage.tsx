import React from 'react';
import { Heart, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface LandingPageProps {
  onEnter: () => void;
  onPreOrder: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors relative">
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-500" />
        ) : (
          <Moon className="w-5 h-5 text-slate-600" />
        )}
      </button>

      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center space-x-3 mb-8">
          <Heart className="w-14 h-14 text-rose-500" />
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
            Worship & Yapps
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-200 mb-4 font-medium">
          Calgary's Premier Bible Study Community
        </p>

        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Connect with fellow believers, dive deep into Scripture, and build lasting friendships
          through engaging discussions and community events.
        </p>

        <button
          onClick={onEnter}
          className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg inline-flex items-center space-x-2"
        >
          <span>Enter Community</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="mt-6 text-slate-500 dark:text-slate-500 text-sm">
          Based in Calgary, AB
        </p>
      </div>
    </div>
  );
}
