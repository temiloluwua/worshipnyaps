import React, { useState, useEffect, Suspense } from 'react';
import { Header } from './components/Header';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { CommunityView } from './components/network/NetworkView';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { SkipLinks } from './components/ui/SkipLinks';
import { ProfilePage } from './components/profile/ProfilePage';
import { SearchPage } from './components/search/SearchPage';
import { MessagesView } from './components/messages/MessagesView';
import { NotificationsPage } from './components/notifications/NotificationsPage';
import { HashtagPage } from './components/hashtags/HashtagPage';
import { lazyWithRetry } from './lib/lazyWithRetry';

// Wrapped with lazyWithRetry (not React.lazy directly) so that a stale
// chunk reference after a new deploy self-heals with one reload instead
// of crashing the app. See src/lib/lazyWithRetry.tsx.
const LocationsView = lazyWithRetry(() => import('./components/locations/LocationsView').then(m => ({ default: m.LocationsView })), 'LocationsView');
const ShopPage = lazyWithRetry(() => import('./components/shop/ShopPage').then(m => ({ default: m.ShopPage })), 'ShopPage');
const SuccessPage = lazyWithRetry(() => import('./components/shop/SuccessPage').then(m => ({ default: m.SuccessPage })), 'SuccessPage');
const EventDetailView = lazyWithRetry(() => import('./components/events/EventDetailView').then(m => ({ default: m.EventDetailView })), 'EventDetailView');

import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useDirectMessages } from './hooks/useDirectMessages';
import { useNotifications } from './hooks/useNotifications';
import { useDevicePush } from './hooks/useDevicePush';
import { Topic } from './lib/supabase';

interface ViewState {
  type: 'main' | 'profile' | 'hashtag' | 'network';
  userId?: string;
  hashtagName?: string;
  initialChatUserId?: string;
  returnEventId?: string;
}

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('topics');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: 'main' });
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [openCreatePostRequest, setOpenCreatePostRequest] = useState(0);
  const { loading, user, profile } = useAuth();
  const { theme } = useTheme();
  const { totalUnread: unreadMessages } = useDirectMessages();
  const { unreadCount: unreadNotifications } = useNotifications();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Skip landing page on reload if the user is already signed in,
  // unless they're explicitly visiting /shop or /event/...
  useEffect(() => {
    if (!loading && user) {
      const path = window.location.pathname;
      const isDeepLink = path.startsWith('/shop') || path.startsWith('/event/');
      if (!isDeepLink) {
        setShowLanding(false);
      }
    }
  }, [loading, user]);

  useEffect(() => {
    if (!user || !profile) {
      setShowOnboarding(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(`wny_onboarding_done_${user.id}`) === '1';
    } catch {
      dismissed = false;
    }
    const profileIsBlank = !profile.avatar_url && !profile.bio;
    if (!dismissed && profileIsBlank) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, profile]);

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
    const fromEventId = activeEventId;
    setViewState({ type: 'profile', userId, returnEventId: fromEventId ?? undefined });
    if (fromEventId) setActiveEventId(null);
  };

  const handleBackFromProfile = () => {
    if (viewState.returnEventId) {
      const eventId = viewState.returnEventId;
      setViewState({ type: 'main' });
      setActiveEventId(eventId);
    } else {
      setViewState({ type: 'main' });
    }
  };

  const handleViewHashtag = (hashtagName: string) => {
    setViewState({ type: 'hashtag', hashtagName });
  };

  const handleBackToMain = () => {
    setViewState({ type: 'main' });
  };

  // Push notifications: capture device token + route on tap.
  useDevicePush({
    onNotificationOpened: (data) => {
      const eventId = typeof data?.event_id === 'string' ? data.event_id : null;
      const conversationId = typeof data?.conversation_id === 'string' ? data.conversation_id : null;
      const userId = typeof data?.user_id === 'string' ? data.user_id : null;
      if (eventId) {
        handleOpenEvent(eventId);
      } else if (conversationId) {
        setActiveTab('messages');
      } else if (userId) {
        setViewState({ type: 'profile', userId });
      } else {
        setActiveTab('notifications');
      }
    },
  });

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

  const loadingFallback = (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-hidden="true" />
    </div>
  );

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
          <p className="text-gray-600 dark:text-gray-400">Loading Worship N Yaps...</p>
        </div>
      </div>
    );
  }

  if (showSuccessPage) {
    return (
      <Suspense fallback={loadingFallback}>
        <SuccessPage onBackToShop={handleBackToShop} onBackToHome={handleBackToHome} />
      </Suspense>
    );
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
      <Suspense fallback={loadingFallback}>
        <EventDetailView
          eventId={activeEventId}
          onBack={handleCloseEvent}
          onViewProfile={handleViewProfile}
        />
      </Suspense>
    );
  }

  if (viewState.type === 'profile' && viewState.userId) {
    return (
      <ProfilePage
        userId={viewState.userId}
        onBack={handleBackFromProfile}
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
          onShowLanding={() => setShowLanding(true)}
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
        onShowLanding={() => setShowLanding(true)}
        unreadNotifications={unreadNotifications}
      />

      <main id="main-content" tabIndex={-1} className="pb-16 focus:outline-none">
        {activeTab === 'topics' && (
          <TopicsView
            onViewProfile={handleViewProfile}
            onViewHashtag={handleViewHashtag}
            focusTopicId={focusedTopicId}
            onFocusedTopicHandled={() => setFocusedTopicId(null)}
            onViewShop={() => setActiveTab('shop')}
            openCreateRequest={openCreatePostRequest}
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
          <Suspense fallback={loadingFallback}>
            <LocationsView onOpenEvent={handleOpenEvent} />
          </Suspense>
        )}
        {activeTab === 'messages' && (
          <div className="fixed inset-0 top-16 bottom-16 z-10">
            <MessagesView
              onBack={() => setActiveTab('topics')}
              initialUserId={viewState.initialChatUserId}
            />
          </div>
        )}
        {activeTab === 'notifications' && (
          <NotificationsPage
            onViewProfile={handleViewProfile}
            onViewTopic={(topicId) => focusTopicById(topicId)}
            onViewEvent={handleOpenEvent}
          />
        )}
        {activeTab === 'shop' && (
          <Suspense fallback={loadingFallback}>
            <ShopPage />
          </Suspense>
        )}
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

      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            if (user) {
              setShowLanding(false);
              setViewState({ type: 'profile', userId: user.id });
            }
          }}
          onCreatePost={() => {
            setActiveTab('topics');
            setOpenCreatePostRequest(n => n + 1);
          }}
          onBrowseEvents={() => setActiveTab('locations')}
        />
      )}
    </div>
  );
}

export default App;
