import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { CommunityView } from './components/network/NetworkView';
import { SignupView } from './components/signup/SignupView';
import { ShopView } from './components/shop/ShopView';
import { AuthModal } from './components/auth/AuthModal';
import { useAuth } from './hooks/useAuth';
import { testConnection } from './lib/supabase';
import toast from 'react-hot-toast';

function App() {
  const [activeTab, setActiveTab] = useState<'topics' | 'locations' | 'signup' | 'network' | 'shop'>('topics');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Worship and Yapps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onShowAuth={() => setShowAuthModal(true)} />
      
      <main className="pb-16">
        {activeTab === 'topics' && <TopicsView />}
        {activeTab === 'locations' && <LocationsView />}
        {activeTab === 'network' && <CommunityView />}
        {activeTab === 'signup' && <SignupView />}
        {activeTab === 'shop' && <ShopView />}
      </main>
      
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  );
}

export default App;