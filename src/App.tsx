import React, { useState, useEffect, Suspense, lazy } from 'react';
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

const LocationsView = lazy(() => import('./components/locations/LocationsView').then(m => ({ default: m.LocationsView })));
const ShopPage = lazy(() => import('./components/shop/ShopPage').then(m => ({ default: m.ShopPage })));
const SuccessPage = lazy(() => import('./components/shop/SuccessPage').then(m => ({ default: m.SuccessPage })));
const EventDetailView = lazy(() => import('./components/events/EventDetailView').then(m => ({ default: m.EventDetailView })));

import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AgeGate } from './components/auth/AgeGate';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useDirectMessages } from './hooks/useDirectMessages';
import { useNotifications } from './hooks/useNotifications';
import { useDevicePush } from './hooks/useDevicePush';
import { useOAuthDeepLink } from './hooks/useOAuthDeepLink';
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
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: 'main' });
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [openCreatePostRequest, setOpenCreatePostRequest] = useState(0);
  const [ageVerified, setAgeVerified] = useState(false);
  const { loading, user, profile } = useAuth();
  useOAuthDeepLink();
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
      // Close the auth modal once signed in. The Google in-app flow completes
      // via the OAuth deep-link handler, which doesn't call the modal's
      // onSuccess, so close it here as a catch-all.
      setShowAuthModal(false);
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
    // The event view is a full-flow page, not a fixed overlay, so reset the
    // scroll position — otherwise it opens mid-page at the previous scroll.
    window.scrollTo(0, 0);
  };

  const handleCloseEvent = () => {
    setActiveEventId(null);
    setShowLanding(false);
    setActiveTab('locations');
    if (window.location.pathname.startsWith('/event/')) {
      window.history.pushState({}, '', '/');
    }
    // Return to the top of the locations view instead of wherever the event
    // page happened to be scrolled.
    window.scrollTo(0, 0);
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

  // Age verification gate: any signed-in user without a recorded birthdate
  // must confirm they meet the 13+ minimum before using the app.
  if (user && profile && !profile.birthdate && !ageVerified) {
    return (
      <AgeGate
        onVerified={() => setAgeVerified(true)}
        onUnderage={() => { setAgeVerified(false); setShowLanding(true); }}
      />
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
        onViewTopics={() => {
          setActiveTab('topics');
          setShowLanding(false);
        }}
        onViewTopicOfDay={(topicId) => focusTopicById(topicId)}
        onCreateAccount={() => {
          setAuthMode('signup');
          setShowLanding(false);
          setShowAuthModal(true);
        }}
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
          onRequireAuth={() => { setAuthMode('signup'); setShowAuthModal(true); }}
        />
        {/* This branch returns early (before the main layout that hosts the
            AuthModal), so mount it here too — needed by the team-join flow. */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => { setShowAuthModal(false); setAuthMode('login'); }}
          initialMode={authMode}
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
        onOpenEvent={handleOpenEvent}
        onViewProfile={handleViewProfile}
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
        <main style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
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

      <main
        id="main-content"
        tabIndex={-1}
        className="focus:outline-none"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {activeTab === 'topics' && (
          <TopicsView
            onViewProfile={handleViewProfile}
            onViewHashtag={handleViewHashtag}
            focusTopicId={focusedTopicId}
            onFocusedTopicHandled={() => setFocusedTopicId(null)}
            onViewShop={() => setActiveTab('shop')}
            openCreateRequest={openCreatePostRequest}
            onOpenEvent={handleOpenEvent}
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
          <div
            className="fixed left-0 right-0 z-10"
            style={{
              top: 'calc(4rem + env(safe-area-inset-top))',
              bottom: 'calc(4rem + env(safe-area-inset-bottom))',
            }}
          >
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
        onClose={() => { setShowAuthModal(false); setAuthMode('login'); }}
        initialMode={authMode}
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
