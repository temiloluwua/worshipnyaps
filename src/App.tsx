import React, { useState } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { CommunityView } from './components/network/NetworkView';
import { SignupView } from './components/signup/SignupView';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { useAuth } from './hooks/useAuth';
import { useOnboarding } from './hooks/useOnboarding';

function App() {
  const [activeTab, setActiveTab] = useState<'topics' | 'locations' | 'signup' | 'network'>('topics');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading } = useAuth();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  console.log('App: Loading state:', loading);
  console.log('App: User state:', user ? 'Logged in' : 'Not logged in');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Worship and Yapps...</p>
          <p className="text-xs text-gray-500 mt-2">Connecting to database...</p>
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
      
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={skipOnboarding}
        onComplete={completeOnboarding}
      />
    </div>
  );
}

export default App;