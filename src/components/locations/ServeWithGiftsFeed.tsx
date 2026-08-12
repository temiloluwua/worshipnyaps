import React from 'react';
import { Sparkles } from 'lucide-react';
import { useGiftMatches } from '../../hooks/useGiftMatches';
import { giftEmoji } from '../../lib/giftMatching';
import { formatDateShort } from '../../lib/eventFormat';

interface ServeWithGiftsFeedProps {
  gifts?: string[] | null;
  onOpenEvent?: (eventId: string) => void;
}

// Horizontal strip at the top of Discover recommending events that need help
// the viewer is gifted to give. Renders nothing when the viewer has no gifts
// set or there are no current matches, so it never adds empty chrome.
export const ServeWithGiftsFeed: React.FC<ServeWithGiftsFeedProps> = ({ gifts, onOpenEvent }) => {
  const { matches } = useGiftMatches(gifts);

  if (matches.length === 0) return null;

  return (
    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
          Serve with your gifts
        </h3>
      </div>
      <p className="text-xs text-purple-700/80 dark:text-purple-300/70 mb-3">
        These gatherings need help you're gifted to give.
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => onOpenEvent?.(m.eventId)}
            className="flex-shrink-0 w-56 text-left bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/60 rounded-lg p-3 hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-lg">{giftEmoji(m.matchedGift)}</span>
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate">
                {m.title}
              </span>
            </div>
            <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
              {m.eventTitle}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {formatDateShort(m.eventDate)}
              {m.hostName ? ` · ${m.hostName}` : ''}
            </div>
            {m.matchedGift && (
              <div className="mt-2 inline-block text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                Because you're gifted in {m.matchedGift}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
