import React from 'react';
import { TopicCard } from './TopicCard';

interface TopicOfTheDayCardProps {
  topic: any;
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onEdit: () => void;
  onView: () => void;
}

export const TopicOfTheDayCard: React.FC<TopicOfTheDayCardProps> = ({
  topic,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onShare,
  onEdit,
  onView,
}) => {
  // Lightweight wrapper around TopicCard with the "game" style for emphasis
  return (
    <TopicCard
      topic={topic}
      isLiked={isLiked}
      isBookmarked={isBookmarked}
      onLike={onLike}
      onBookmark={onBookmark}
      onShare={onShare}
      onEdit={onEdit}
      onView={onView}
      cardStyle="game"
    />
  );
};

