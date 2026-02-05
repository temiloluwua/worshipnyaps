import React from 'react';
import { UserPlus, UserMinus, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useConnections } from '../../hooks/useConnections';

interface ProfileCardProps {
  user: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
    bio?: string;
    interests?: string[];
    spiritual_gifts?: string[];
  };
  onViewProfile?: () => void;
  onStartChat?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  onViewProfile,
  onStartChat,
  showActions = true,
  compact = false
}) => {
  const { user: currentUser } = useAuth();
  const {
    isConnected,
    hasPendingRequest,
    sendConnectionRequest,
    removeConnection
  } = useConnections();

  const isOwnProfile = currentUser?.id === user.id;
  const connected = isConnected(user.id);
  const pending = hasPendingRequest(user.id);

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (connected) {
      await removeConnection(user.id);
    } else {
      await sendConnectionRequest(user.id);
    }
  };

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartChat?.();
  };

  if (compact) {
    return (
      <div
        onClick={onViewProfile}
        className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {user.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {user.name}
          </p>
          {user.email && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              @{user.email.split('@')[0]}
            </p>
          )}
        </div>
        {showActions && !isOwnProfile && (
          <button
            onClick={handleConnect}
            disabled={pending}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              connected
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                : pending
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {connected ? 'Connected' : pending ? 'Pending' : 'Connect'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onViewProfile}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="h-20 bg-gradient-to-br from-blue-500 to-blue-700"></div>

      <div className="px-4 pb-4">
        <div className="relative -mt-10 mb-3">
          <div className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {user.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-bold text-gray-900 dark:text-white truncate">
          {user.name}
        </h3>
        {user.email && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
            @{user.email.split('@')[0]}
          </p>
        )}

        {user.bio && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
            {user.bio}
          </p>
        )}

        {user.interests && user.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {user.interests.slice(0, 3).map((interest, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs"
              >
                {interest}
              </span>
            ))}
            {user.interests.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{user.interests.length - 3} more
              </span>
            )}
          </div>
        )}

        {user.spiritual_gifts && user.spiritual_gifts.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Spiritual Gifts
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {user.spiritual_gifts.map((gift, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-xs border border-amber-200 dark:border-amber-800"
                >
                  {gift}
                </span>
              ))}
            </div>
          </div>
        )}

        {showActions && !isOwnProfile && (
          <div className="flex space-x-2">
            <button
              onClick={handleConnect}
              disabled={pending}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                connected
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-600'
                  : pending
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {connected ? (
                <span className="flex items-center justify-center">
                  <UserMinus className="w-4 h-4 mr-1" />
                  Connected
                </span>
              ) : pending ? (
                'Pending'
              ) : (
                <span className="flex items-center justify-center">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Connect
                </span>
              )}
            </button>
            {onStartChat && (
              <button
                onClick={handleChat}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
