import React from 'react';
import { Repeat } from 'lucide-react';
import { TopicCard } from '../topics/TopicCard';
import type { Repost } from '../../hooks/useReposts';

interface RepostCardProps {
  repost: Repost;
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onView: () => void;
  onViewProfile?: (userId: string) => void;
}

// Renders a repost (or quote) in the feed: a "reposted" attribution line,
// an optional quote from the reposter, then the original post embedded via
// the normal TopicCard.
export const RepostCard: React.FC<RepostCardProps> = ({
  repost,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onShare,
  onView,
  onViewProfile,
}) => {
  const original = repost.original_topic;
  if (!original) return null;
  const reposterName = repost.user?.name || 'Someone';

  return (
    <article className="border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 px-4 pt-3 text-xs text-gray-500 dark:text-gray-400">
        <Repeat className="w-3.5 h-3.5 text-green-600" />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (repost.user?.id) onViewProfile?.(repost.user.id); }}
          className="font-medium hover:underline touch-manipulation"
        >
          {reposterName}
        </button>
        <span>{repost.quote_text ? 'quoted' : 'reposted'}</span>
      </div>

      {repost.quote_text && (
        <p className="px-4 pt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {repost.quote_text}
        </p>
      )}

      <div className="px-2 pt-1">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <TopicCard
            topic={original}
            isLiked={isLiked}
            isBookmarked={isBookmarked}
            onLike={onLike}
            onBookmark={onBookmark}
            onShare={onShare}
            onEdit={() => {}}
            onView={onView}
            onViewProfile={onViewProfile}
            cardStyle="feed"
          />
        </div>
      </div>
    </article>
  );
};
