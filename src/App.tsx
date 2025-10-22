import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { CommunityView } from './components/network/NetworkView';
import { SignupView } from './components/signup/SignupView';
import { AuthModal } from './components/auth/AuthModal';
import { useAuth } from './hooks/useAuth';
import { testConnection } from './lib/supabase';
import toast from 'react-hot-toast';

function App() {
  const [activeTab, setActiveTab] = useState<'topics' | 'locations' | 'signup' | 'network'>('topics');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const { loading } = useAuth();

  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        setConnectionError(true);
        toast.error('Unable to connect to database. Some features may not work.', {
          duration: 5000,
        });
      }
    };
    checkConnection();
  }, []);

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

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">
            Unable to connect to the database. Please check your internet connection and ensure the database is accessible.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
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
    </div>
  );
}

export default App;