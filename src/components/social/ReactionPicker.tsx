import React, { useState, useRef, useEffect } from 'react';
import { ReactionType, REACTION_EMOJI } from '../../hooks/useReactions';

interface ReactionPickerProps {
  targetType: 'topic' | 'comment' | 'message';
  targetId: string;
  userReactions: ReactionType[];
  reactionCounts: Record<ReactionType, number>;
  onToggleReaction: (reaction: ReactionType) => void;
  showCounts?: boolean;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  targetType,
  targetId,
  userReactions,
  reactionCounts,
  onToggleReaction,
  showCounts = true
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);

  const topReactions = (Object.entries(reactionCounts) as [ReactionType, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        onMouseEnter={() => setShowPicker(true)}
        className="flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
      >
        {topReactions.length > 0 ? (
          <div className="flex -space-x-1">
            {topReactions.map(([type]) => (
              <span key={type} className="text-base">
                {REACTION_EMOJI[type]}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 text-sm">
            React
          </span>
        )}
        {showCounts && totalReactions > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
            {totalReactions}
          </span>
        )}
      </button>

      {showPicker && (
        <div
          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-1 flex space-x-1 z-50"
          onMouseLeave={() => setShowPicker(false)}
        >
          {(Object.keys(REACTION_EMOJI) as ReactionType[]).map(reaction => (
            <button
              key={reaction}
              onClick={() => {
                onToggleReaction(reaction);
                setShowPicker(false);
              }}
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-125 ${
                userReactions.includes(reaction)
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : ''
              }`}
              title={reaction}
            >
              <span className="text-xl">{REACTION_EMOJI[reaction]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface ReactionSummaryProps {
  reactionCounts: Record<ReactionType, number>;
  onClick?: () => void;
}

export const ReactionSummary: React.FC<ReactionSummaryProps> = ({
  reactionCounts,
  onClick
}) => {
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);

  if (totalReactions === 0) return null;

  const activeReactions = (Object.entries(reactionCounts) as [ReactionType, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 hover:underline"
    >
      <div className="flex -space-x-1">
        {activeReactions.slice(0, 3).map(([type]) => (
          <span
            key={type}
            className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs"
          >
            {REACTION_EMOJI[type]}
          </span>
        ))}
      </div>
      <span>{totalReactions}</span>
    </button>
  );
};
