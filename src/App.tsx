import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { CommunityView } from './components/network/NetworkView';
import { ShopPage } from './components/shop/ShopPage';
import { SuccessPage } from './components/shop/SuccessPage';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { SkipLinks } from './components/ui/SkipLinks';
import { ProfilePage } from './components/profile/ProfilePage';
import { SearchPage } from './components/search/SearchPage';
import { MessagesView } from './components/messages/MessagesView';
import { NotificationsPage } from './components/notifications/NotificationsPage';
import { HashtagPage } from './components/hashtags/HashtagPage';
import { EventDetailView } from './components/events/EventDetailView';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useDirectMessages } from './hooks/useDirectMessages';
import { useNotifications } from './hooks/useNotifications';
import { Topic } from './lib/supabase';

interface ViewState {
  type: 'main' | 'profile' | 'hashtag' | 'network';
  userId?: string;
  hashtagName?: string;
  initialChatUserId?: string;
}

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('topics');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: 'main' });
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);
  const { loading, user } = useAuth();
  const { theme } = useTheme();
  const { totalUnread: unreadMessages } = useDirectMessages();
  const { unreadCount: unreadNotifications } = useNotifications();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const applyPathState = () => {
      const path = window.location.pathname;
      const eventMatch = path.match(/^\/event\/([^/]+)$/);
      if (eventMatch) {
        setShowLanding(false);
        setShowSuccessPage(false);
        setActiveTab('locations');
        setActiveEventId(decodeURIComponent(eventMatch[1]));
        return;
      }

      setActiveEventId(null);

      if (path === '/shop/success') {
        setShowLanding(false);
        setShowSuccessPage(true);
      } else if (path === '/shop') {
        setShowLanding(false);
        setShowSuccessPage(false);
        setActiveTab('shop');
      } else {
        setShowSuccessPage(false);
      }
    };

    applyPathState();
    window.addEventListener('popstate', applyPathState);
    return () => window.removeEventListener('popstate', applyPathState);
  }, []);

  const focusTopicById = (topicId: string) => {
    setShowLanding(false);
    setShowSuccessPage(false);
    setActiveTab('topics');
    setViewState({ type: 'main' });
    setFocusedTopicId(topicId);
  };

  const handleEnterApp = () => {
    setShowLanding(false);
  };

  const handlePreOrder = () => {
    setShowLanding(false);
    setActiveTab('shop');
  };

  const handleViewEvents = () => {
    setShowLanding(false);
    setActiveTab('locations');
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

  const handleOpenEvent = (eventId: string) => {
    setShowLanding(false);
    setShowSuccessPage(false);
    setViewState({ type: 'main' });
    setActiveTab('locations');
    setActiveEventId(eventId);
    window.history.pushState({}, '', `/event/${eventId}`);
  };

  const handleCloseEvent = () => {
    setActiveEventId(null);
    setShowLanding(false);
    setActiveTab('locations');
    if (window.location.pathname.startsWith('/event/')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleViewProfile = (userId: string) => {
    setViewState({ type: 'profile', userId });
  };

  const handleViewHashtag = (hashtagName: string) => {
    setViewState({ type: 'hashtag', hashtagName });
  };

  const handleBackToMain = () => {
    setViewState({ type: 'main' });
  };

  const handleStartChat = (userId: string) => {
    setViewState({ type: 'main', initialChatUserId: userId });
    setActiveTab('messages');
  };

  const handleViewTopic = (topic: Topic) => {
    focusTopicById(topic.id);
  };

  const handleViewNetwork = () => {
    setViewState({ type: 'network' });
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
    return (
      <LandingPage
        onEnter={handleEnterApp}
        onPreOrder={handlePreOrder}
        onViewEvents={handleViewEvents}
        onViewTopicOfDay={(topicId) => focusTopicById(topicId)}
      />
    );
  }

  if (activeEventId) {
    return (
      <EventDetailView
        eventId={activeEventId}
        onBack={handleCloseEvent}
      />
    );
  }

  if (viewState.type === 'profile' && viewState.userId) {
    return (
      <ProfilePage
        userId={viewState.userId}
        onBack={handleBackToMain}
        onStartChat={handleStartChat}
        onViewTopic={handleViewTopic}
      />
    );
  }

  if (viewState.type === 'hashtag' && viewState.hashtagName) {
    return (
      <HashtagPage
        hashtagName={viewState.hashtagName}
        onBack={handleBackToMain}
        onViewTopic={handleViewTopic}
        onViewProfile={handleViewProfile}
      />
    );
  }

  if (viewState.type === 'network') {
    return (
      <>
        <Header
          onShowAuth={() => setShowAuthModal(true)}
          onViewProfile={user ? () => handleViewProfile(user.id) : undefined}
          onViewNotifications={() => setActiveTab('notifications')}
          onViewNetwork={handleViewNetwork}
          unreadNotifications={unreadNotifications}
        />
        <main className="pb-16">
          <CommunityView
            onViewProfile={handleViewProfile}
            onStartChat={handleStartChat}
          />
        </main>
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setViewState({ type: 'main' });
          }}
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <SkipLinks
        links={[
          { id: 'main-content', label: 'Skip to main content' },
          { id: 'main-navigation', label: 'Skip to navigation' },
        ]}
      />

      <Header
        onShowAuth={() => setShowAuthModal(true)}
        onViewProfile={user ? () => handleViewProfile(user.id) : undefined}
        onViewNotifications={() => setActiveTab('notifications')}
        onViewNetwork={handleViewNetwork}
        unreadNotifications={unreadNotifications}
      />

      <main id="main-content" tabIndex={-1} className="pb-16 focus:outline-none">
        {activeTab === 'topics' && (
          <TopicsView
            onViewProfile={handleViewProfile}
            onViewHashtag={handleViewHashtag}
            focusTopicId={focusedTopicId}
            onFocusedTopicHandled={() => setFocusedTopicId(null)}
          />
        )}
        {activeTab === 'search' && (
          <SearchPage
            onViewProfile={handleViewProfile}
            onViewTopic={handleViewTopic}
            onViewHashtag={handleViewHashtag}
            onStartChat={handleStartChat}
          />
        )}
        {activeTab === 'locations' && (
          <LocationsView onOpenEvent={handleOpenEvent} />
        )}
        {activeTab === 'messages' && (
          <MessagesView
            onBack={() => setActiveTab('topics')}
            initialUserId={viewState.initialChatUserId}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsPage
            onViewProfile={handleViewProfile}
            onViewTopic={(topicId) => focusTopicById(topicId)}
            onViewEvent={handleOpenEvent}
          />
        )}
        {activeTab === 'shop' && <ShopPage />}
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (viewState.initialChatUserId && tab !== 'messages') {
            setViewState({ type: 'main' });
          }
        }}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
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
