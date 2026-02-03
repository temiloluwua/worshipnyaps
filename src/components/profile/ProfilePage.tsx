import React, { useState, useEffect } from 'react';
import {
  Camera, MapPin, Calendar, Settings, MessageCircle,
  UserPlus, UserMinus, ArrowLeft, Heart, Bookmark,
  Repeat, Link as LinkIcon, Grid, List
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile, ExtendedProfile } from '../../hooks/useProfile';
import { useConnections } from '../../hooks/useConnections';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useLikes } from '../../hooks/useLikes';
import { Topic } from '../../lib/supabase';
import { TopicCard } from '../topics/TopicCard';
import { EditProfileModal } from './EditProfileModal';
import { format } from 'date-fns';

interface ProfilePageProps {
  userId: string;
  onBack: () => void;
  onStartChat?: (userId: string) => void;
  onViewTopic?: (topic: Topic) => void;
}

type ProfileTab = 'posts' | 'likes' | 'bookmarks' | 'reposts';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userId,
  onBack,
  onStartChat,
  onViewTopic
}) => {
  const { user } = useAuth();
  const {
    viewingProfile,
    loading,
    fetchProfile,
    fetchUserPosts,
    fetchUserLikedPosts
  } = useProfile();
  const {
    isConnected,
    hasPendingRequest,
    sendConnectionRequest,
    removeConnection
  } = useConnections();
  const { bookmarkedTopics, fetchBookmarkedTopics, isBookmarked, toggleBookmark } = useBookmarks();
  const { isLiked, toggleLike, getLikeCount, fetchLikeCounts } = useLikes();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<Topic[]>([]);
  const [likedPosts, setLikedPosts] = useState<Topic[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  const isOwnProfile = user?.id === userId;
  const connected = isConnected(userId);
  const pendingRequest = hasPendingRequest(userId);

  useEffect(() => {
    fetchProfile(userId);
  }, [userId, fetchProfile]);

  useEffect(() => {
    const loadTabContent = async () => {
      setTabLoading(true);
      if (activeTab === 'posts') {
        const userPosts = await fetchUserPosts(userId);
        setPosts(userPosts);
        if (userPosts.length > 0) {
          fetchLikeCounts('topic', userPosts.map(p => p.id));
        }
      } else if (activeTab === 'likes') {
        const liked = await fetchUserLikedPosts(userId);
        setLikedPosts(liked);
      } else if (activeTab === 'bookmarks' && isOwnProfile) {
        await fetchBookmarkedTopics();
      }
      setTabLoading(false);
    };

    loadTabContent();
  }, [activeTab, userId, isOwnProfile]);

  const handleConnect = async () => {
    if (connected) {
      await removeConnection(userId);
    } else {
      await sendConnectionRequest(userId);
    }
  };

  const renderContent = () => {
    if (tabLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    let topics: Topic[] = [];

    switch (activeTab) {
      case 'posts':
        topics = posts;
        break;
      case 'likes':
        topics = likedPosts;
        break;
      case 'bookmarks':
        topics = isOwnProfile ? bookmarkedTopics : [];
        break;
      default:
        topics = [];
    }

    if (topics.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {activeTab === 'posts' && 'No posts yet'}
          {activeTab === 'likes' && 'No liked posts'}
          {activeTab === 'bookmarks' && 'No bookmarks'}
          {activeTab === 'reposts' && 'No reposts'}
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            isLiked={isLiked('topic', topic.id)}
            isBookmarked={isBookmarked(topic.id)}
            onLike={() => toggleLike('topic', topic.id)}
            onBookmark={() => toggleBookmark(topic.id)}
            onShare={() => {}}
            onEdit={() => {}}
            onView={() => onViewTopic?.(topic)}
          />
        ))}
      </div>
    );
  };

  if (loading && !viewingProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!viewingProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Profile not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="ml-4">
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">
              {viewingProfile.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {viewingProfile.stats?.posts_count || 0} posts
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="h-32 sm:h-48 bg-gradient-to-br from-blue-500 to-blue-700 relative">
          {viewingProfile.cover_photo_url && (
            <img
              src={viewingProfile.cover_photo_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="relative -mt-16 sm:-mt-20 mb-4 flex justify-between items-end">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600">
                {viewingProfile.avatar_url ? (
                  <img
                    src={viewingProfile.avatar_url}
                    alt={viewingProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                    {viewingProfile.name.charAt(0)}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex space-x-2 mb-2">
              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  {onStartChat && (
                    <button
                      onClick={() => onStartChat(userId)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={pendingRequest}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${
                      connected
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-600'
                        : pendingRequest
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {connected ? (
                      <span className="flex items-center">
                        <UserMinus className="w-4 h-4 mr-1" />
                        Connected
                      </span>
                    ) : pendingRequest ? (
                      'Pending'
                    ) : (
                      <span className="flex items-center">
                        <UserPlus className="w-4 h-4 mr-1" />
                        Connect
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {viewingProfile.name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              @{viewingProfile.email.split('@')[0]}
            </p>
          </div>

          {viewingProfile.bio && (
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {viewingProfile.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            {viewingProfile.location_text && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {viewingProfile.location_text}
              </div>
            )}
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Joined {format(new Date(viewingProfile.created_at), 'MMMM yyyy')}
            </div>
          </div>

          {viewingProfile.interests && viewingProfile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {viewingProfile.interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          <div className="flex space-x-6">
            <button className="hover:underline">
              <span className="font-bold text-gray-900 dark:text-white">
                {viewingProfile.stats?.connections_count || 0}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                Connections
              </span>
            </button>
            <div>
              <span className="font-bold text-gray-900 dark:text-white">
                {viewingProfile.stats?.likes_received || 0}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                Likes
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex">
          {(['posts', 'likes', ...(isOwnProfile ? ['bookmarks'] : [])] as ProfileTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="capitalize">{tab}</span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white dark:bg-gray-900">
        {renderContent()}
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={viewingProfile}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            fetchProfile(userId);
          }}
        />
      )}
    </div>
  );
};
