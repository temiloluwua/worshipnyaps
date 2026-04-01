import React, { useState, useEffect } from 'react';
import {
  Camera, MapPin, Calendar, MessageCircle,
  UserPlus, UserMinus, ArrowLeft, Heart, Bookmark,
  Sparkles, Settings, LayoutGrid, LayoutList, Link as LinkIcon, Edit2
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

type ProfileTab = 'posts' | 'likes' | 'bookmarks';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userId,
  onBack,
  onStartChat,
  onViewTopic
}) => {
  const { user } = useAuth();
  const { viewingProfile, loading, fetchProfile, fetchUserPosts, fetchUserLikedPosts } = useProfile();
  const { isConnected, hasPendingRequest, sendConnectionRequest, removeConnection } = useConnections();
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

  useEffect(() => { fetchProfile(userId); }, [userId, fetchProfile]);

  useEffect(() => {
    const load = async () => {
      setTabLoading(true);
      if (activeTab === 'posts') {
        const data = await fetchUserPosts(userId);
        setPosts(data);
        if (data.length > 0) fetchLikeCounts('topic', data.map(p => p.id));
      } else if (activeTab === 'likes') {
        setLikedPosts(await fetchUserLikedPosts(userId));
      } else if (activeTab === 'bookmarks' && isOwnProfile) {
        await fetchBookmarkedTopics();
      }
      setTabLoading(false);
    };
    load();
  }, [activeTab, userId, isOwnProfile]);

  const handleConnect = async () => {
    if (connected) await removeConnection(userId);
    else await sendConnectionRequest(userId);
  };

  const getTopicsForTab = (): Topic[] => {
    if (activeTab === 'posts') return posts;
    if (activeTab === 'likes') return likedPosts;
    if (activeTab === 'bookmarks' && isOwnProfile) return bookmarkedTopics;
    return [];
  };

  const emptyMessages: Record<ProfileTab, string> = {
    posts: 'No posts yet',
    likes: 'No liked posts yet',
    bookmarks: 'No bookmarks yet',
  };

  if (loading && !viewingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!viewingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center gap-4">
        <p className="text-gray-500 dark:text-gray-400">Profile not found</p>
        <button onClick={onBack} className="text-blue-600 hover:underline text-sm">Go back</button>
      </div>
    );
  }

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'posts', label: 'Posts', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'likes', label: 'Likes', icon: <Heart className="w-4 h-4" /> },
    ...(isOwnProfile ? [{ id: 'bookmarks' as ProfileTab, label: 'Saved', icon: <Bookmark className="w-4 h-4" /> }] : []),
  ];

  const topics = getTopicsForTab();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-gray-900 dark:text-white truncate">{viewingProfile.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{viewingProfile.stats?.posts_count || 0} posts</p>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="h-40 sm:h-52 bg-gradient-to-br from-blue-500 via-blue-600 to-teal-500 relative overflow-hidden">
          {viewingProfile.cover_photo_url ? (
            <img src={viewingProfile.cover_photo_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-24 h-24 rounded-full border-2 border-white/40" />
              <div className="absolute bottom-4 right-8 w-16 h-16 rounded-full border-2 border-white/30" />
              <div className="absolute top-1/2 right-1/4 w-10 h-10 rounded-full border border-white/20" />
            </div>
          )}
          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Edit cover
            </button>
          )}
        </div>

        <div className="px-4 sm:px-6">
          <div className="relative -mt-14 sm:-mt-16 mb-4 flex justify-between items-end">
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gradient-to-br from-blue-500 to-teal-500 shadow-lg">
                {viewingProfile.avatar_url ? (
                  <img src={viewingProfile.avatar_url} alt={viewingProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                    {viewingProfile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-md transition-colors border-2 border-white dark:border-gray-900"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pb-1">
              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              ) : (
                <>
                  {onStartChat && (
                    <button
                      onClick={() => onStartChat(userId)}
                      className="w-9 h-9 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={pendingRequest}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      connected
                        ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700'
                        : pendingRequest
                        ? 'border border-gray-300 dark:border-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }`}
                  >
                    {connected ? (
                      <><UserMinus className="w-3.5 h-3.5" /> Connected</>
                    ) : pendingRequest ? (
                      'Pending...'
                    ) : (
                      <><UserPlus className="w-3.5 h-3.5" /> Connect</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{viewingProfile.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{viewingProfile.email?.split('@')[0]}</p>
          </div>

          {viewingProfile.bio ? (
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
              {viewingProfile.bio}
            </p>
          ) : isOwnProfile ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="text-sm text-gray-400 dark:text-gray-500 italic mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              + Add a bio
            </button>
          ) : null}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
            {viewingProfile.location_text && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {viewingProfile.location_text}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Joined {format(new Date(viewingProfile.created_at), 'MMMM yyyy')}
            </span>
          </div>

          <div className="flex gap-5 mb-4">
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">{viewingProfile.stats?.connections_count || 0}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">Connections</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">{viewingProfile.stats?.posts_count || 0}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">Posts</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">{viewingProfile.stats?.likes_received || 0}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">Likes</span>
            </div>
          </div>

          {viewingProfile.interests && viewingProfile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {viewingProfile.interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800/50"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          {viewingProfile.spiritual_gifts && viewingProfile.spiritual_gifts.length > 0 && (
            <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Spiritual Gifts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {viewingProfile.spiritual_gifts.map((gift, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium"
                  >
                    {gift}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-[57px] z-10">
        <nav className="flex px-4 sm:px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white dark:bg-gray-900 min-h-[200px]">
        {tabLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 dark:text-gray-600">
            {activeTab === 'posts' && <LayoutGrid className="w-8 h-8" />}
            {activeTab === 'likes' && <Heart className="w-8 h-8" />}
            {activeTab === 'bookmarks' && <Bookmark className="w-8 h-8" />}
            <p className="text-sm">{emptyMessages[activeTab]}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
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
        )}
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={viewingProfile}
          onClose={() => setShowEditModal(false)}
          onSave={() => { setShowEditModal(false); fetchProfile(userId); }}
        />
      )}
    </div>
  );
};
