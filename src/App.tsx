import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { CommunityView } from './components/network/NetworkView';
import { ShopView } from './components/shop/ShopView';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<'topics' | 'locations' | 'network' | 'shop'>('topics');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { loading } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const handleEnterApp = () => {
    setShowLanding(false);
  };

  const handlePreOrder = () => {
    setShowLanding(false);
    setActiveTab('shop');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Worship and Yapps...</p>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return <LandingPage onEnter={handleEnterApp} onPreOrder={handlePreOrder} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header onShowAuth={() => setShowAuthModal(true)} />

      <main className="pb-16">
        {activeTab === 'topics' && <TopicsView />}
        {activeTab === 'locations' && <LocationsView />}
        {activeTab === 'network' && <CommunityView />}
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
