import React, { useState } from 'react';
import { MessageSquare, MapPin, Users, ShoppingBag, Heart, BookOpen, Sparkles, ArrowRight, Bell, Eye } from 'lucide-react';
import { WaitlistModal } from './WaitlistModal';
import { useAuth } from '../../hooks/useAuth';

interface LandingPageProps {
  onEnter: () => void;
  onPreOrder: () => void;
}

export function LandingPage({ onEnter, onPreOrder }: LandingPageProps) {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const { signInAsGuest } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center space-x-2 mb-6">
            <Heart className="w-12 h-12 text-rose-500" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Worship & Yapps
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-700 mb-4">
            Calgary's Premier Bible Study Community
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with fellow believers, dive deep into Scripture, and build lasting friendships
            through engaging discussions and community events.
          </p>
        </div>

        {/* Card Game Pre-Order Banner */}
        <div className="relative mb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-10 rounded-3xl"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl border-4 border-amber-400 p-8 md:p-12">
            <div className="absolute top-0 right-0 bg-amber-400 text-white px-6 py-2 rounded-bl-2xl font-bold text-sm">
              PRE-ORDER NOW
            </div>
            <Sparkles className="w-16 h-16 text-amber-500 mb-4 mx-auto" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
              🎴 Faith Discussion Card Game
            </h2>
            <p className="text-lg text-gray-700 mb-6 text-center max-w-2xl mx-auto">
              Transform your Bible study with our engaging card game! Perfect for small groups,
              youth ministries, and family devotions. Each card sparks meaningful conversations
              about faith, life, and Scripture.
            </p>
            <div className="flex flex-col gap-4 items-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                <button
                  onClick={onPreOrder}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2"
                >
                  <ShoppingBag className="w-6 h-6" />
                  <span>Pre-Order Your Deck</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">$29.99</p>
                  <p className="text-sm text-gray-600">Limited Early Bird Price</p>
                </div>
              </div>
              <button
                onClick={() => setShowWaitlist(true)}
                className="px-6 py-3 bg-white border-2 border-amber-400 text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all flex items-center space-x-2"
              >
                <Bell className="w-5 h-5" />
                <span>Join Waitlist - Get Notified</span>
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Daily Topics</h3>
            <p className="text-gray-600">
              Swipe through thought-provoking discussion cards rooted in Scripture
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Local Events</h3>
            <p className="text-gray-600">
              Find Bible studies and gatherings happening across Calgary
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Community</h3>
            <p className="text-gray-600">
              Connect with believers who share your passion for faith and fellowship
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Deep Dives</h3>
            <p className="text-gray-600">
              Engage in meaningful discussions that strengthen your understanding
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-4">
          <button
            onClick={onEnter}
            className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl"
          >
            Enter Community
          </button>
          <div>
            <button
              onClick={async () => {
                await signInAsGuest();
                onEnter();
              }}
              className="px-8 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-md flex items-center space-x-2 mx-auto"
            >
              <Eye className="w-5 h-5" />
              <span>Browse as Guest</span>
            </button>
          </div>
          <p className="text-gray-600">
            Join hundreds of believers growing together in faith
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Based in Calgary, AB • Building community through faith</p>
        </div>
      </div>

      <WaitlistModal
        isOpen={showWaitlist}
        onClose={() => setShowWaitlist(false)}
        productType="card_game"
      />
    </div>
  );
}
