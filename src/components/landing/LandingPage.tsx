import React from 'react';
import { Heart, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
  onPreOrder: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center space-x-3 mb-8">
          <Heart className="w-14 h-14 text-rose-500" />
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
            Worship & Yapps
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-slate-700 mb-4 font-medium">
          Calgary's Premier Bible Study Community
        </p>

        <p className="text-lg text-slate-600 max-w-xl mx-auto mb-10 leading-relaxed">
          Connect with fellow believers, dive deep into Scripture, and build lasting friendships
          through engaging discussions and community events.
        </p>

        <button
          onClick={onEnter}
          className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg inline-flex items-center space-x-2"
        >
          <span>Enter Community</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="mt-6 text-slate-500 text-sm">
          Based in Calgary, AB
        </p>
      </div>
    </div>
  );
}
