import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { CommunityView } from './components/network/NetworkView';
import { ShopPage } from './components/shop/ShopPage';
import { SuccessPage } from './components/shop/SuccessPage';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { SkipLinks } from './components/ui/SkipLinks';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<'topics' | 'locations' | 'network' | 'shop'>('topics');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const { loading } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/shop/success') {
      setShowLanding(false);
      setShowSuccessPage(true);
    } else if (path === '/shop') {
      setShowLanding(false);
      setActiveTab('shop');
    }
  }, []);

  const handleEnterApp = () => {
    setShowLanding(false);
  };

  const handlePreOrder = () => {
    setShowLanding(false);
    setActiveTab('shop');
  };

  const handleBackToShop = () => {
    setShowSuccessPage(false);
    setActiveTab('shop');
    window.history.pushState({}, '', '/shop');
  };

  const handleBackToHome = () => {
    setShowSuccessPage(false);
    setActiveTab('topics');
    window.history.pushState({}, '', '/');
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors"
        role="status"
        aria-label="Loading application"
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-gray-600 dark:text-gray-400">Loading Worship and Yapps...</p>
        </div>
      </div>
    );
  }

  if (showSuccessPage) {
    return <SuccessPage onBackToShop={handleBackToShop} onBackToHome={handleBackToHome} />;
  }

  if (showLanding) {
    return <LandingPage onEnter={handleEnterApp} onPreOrder={handlePreOrder} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <SkipLinks
        links={[
          { id: 'main-content', label: 'Skip to main content' },
          { id: 'main-navigation', label: 'Skip to navigation' },
        ]}
      />

      <Header onShowAuth={() => setShowAuthModal(true)} />

      <main id="main-content" tabIndex={-1} className="pb-16 focus:outline-none">
        {activeTab === 'topics' && <TopicsView />}
        {activeTab === 'locations' && <LocationsView />}
        {activeTab === 'network' && <CommunityView />}
        {activeTab === 'shop' && <ShopPage />}
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
}

export default App;