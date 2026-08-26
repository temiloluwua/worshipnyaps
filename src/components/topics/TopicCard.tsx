import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ChevronDown, ChevronUp, Edit, Crown, BookOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslatedTopic } from '../../hooks/useTranslatedTopic';
import { CommentThread } from './CommentThread';

// Small decorative corner flourish that echoes the printed WnY cards. Rendered
// once per corner; the parent flips it with scale-x / scale-y utilities so the
// curl always points inward.
const CornerFlourish: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className} aria-hidden="true">
    <path d="M6 6c16 0 22 4 22 20" />
    <path d="M6 6c0 16 4 22 20 22" />
    <path d="M6 6c8 1 12 5 13 13" opacity="0.55" />
    <circle cx="30" cy="30" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

// Open-book line drawing used behind the Bible references. Matches the printed
// card: just the outer book outline, no centre spine or inner page lines.
const OpenBook: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 220 150" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M110 34C86 18 46 16 20 26v96c26-10 66-8 90 8 24-16 64-18 90-8V26c-26-10-66-8-90 8Z" />
  </svg>
);

interface TopicCardProps {
  topic: any;
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onEdit: () => void;
  onView: () => void;
  onViewProfile?: (userId: string) => void;
  cardStyle?: 'feed' | 'game';
  frameTone?: 'default' | 'gold';
  // Under-18 restricted mode: show the card content but hide all
  // interactions (like / comment / share / bookmark / edit).
  readOnly?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onShare,
  onEdit,
  onView,
  onViewProfile,
  cardStyle = 'feed',
  frameTone = 'default',
  readOnly = false
}) => {
  const authorId: string | undefined = topic.author_id || topic.authorId || topic.users?.id;
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewProfile && authorId) onViewProfile(authorId);
  };
  const { user, profile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const initialCommentCount =
    typeof topic.commentCount === 'number'
      ? topic.commentCount
      : typeof topic.comments === 'number'
        ? topic.comments
        : Array.isArray(topic.comments)
          ? topic.comments.length
          : 0;
  const [commentCount, setCommentCount] = useState<number>(initialCommentCount);

  // Translate the card's content to the active language on the fly (English is
  // a no-op). Falls back to the original text if translation is unavailable.
  const tx = useTranslatedTopic({
    title: typeof topic.title === 'string' ? topic.title : '',
    content: typeof topic.content === 'string' ? topic.content : '',
    questions: Array.isArray(topic.questions) ? topic.questions : [],
    bibleReference: topic.bibleReference || topic.bible_verse || '',
  });

  const safeTitle = tx.title && tx.title.trim().length > 0 ? tx.title : 'Untitled Topic';
  const safeContent = typeof tx.content === 'string' ? tx.content.trim() : '';
  const safeBibleRef = tx.bibleReference || '';
  const translatedQuestions = tx.questions || [];
  const hasQuestions = translatedQuestions.length > 0;

  const openESV = (reference: string) => {
    const url = `https://www.esv.org/${encodeURIComponent(reference.replace(/\s+/g, '+'))}/`;
    window.open(url, '_blank');
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const canEdit = user && (
    topic.author_id === user.id ||
    topic.authorId === user.id ||
    (profile?.role === 'admin')
  );
  const isGoldFrame = cardStyle === 'game' && frameTone === 'gold';
  // Printed-card palette: thin ink-coloured frame + flourishes on cream stock.
  // Topic-of-the-day keeps a warm gold tone; everything else is classic black.
  const frameLineClass = isGoldFrame ? 'border-amber-700/70' : 'border-gray-900/80';
  const flourishClass = isGoldFrame ? 'text-amber-700' : 'text-gray-800';
  const bookClass = isGoldFrame ? 'text-amber-800/80' : 'text-gray-700';
  // The printed cards list each Bible reference on its own line inside the book.
  const bibleReferences: string[] = safeBibleRef
    ? String(safeBibleRef).split(/\s*[\n;,]\s*/).map((r) => r.trim()).filter(Boolean)
    : [];

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
  };

  if (cardStyle === 'game') {
    return (
      <div
        onClick={onView}
        className="relative cursor-pointer overflow-hidden rounded-md bg-[#fbfaf5] px-6 py-7 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 hover:shadow-[0_18px_50px_-15px_rgba(0,0,0,0.4)] sm:px-9 sm:py-9"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {/* Thin double-line frame, echoing the printed card */}
        <div className={`pointer-events-none absolute inset-[10px] rounded-sm border ${frameLineClass}`} />
        <div className={`pointer-events-none absolute inset-[15px] rounded-sm border ${frameLineClass} opacity-50`} />

        {/* Corner flourishes (flipped so each curl points inward) */}
        <CornerFlourish className={`pointer-events-none absolute left-3 top-3 h-7 w-7 ${flourishClass}`} />
        <CornerFlourish className={`pointer-events-none absolute right-3 top-3 h-7 w-7 -scale-x-100 ${flourishClass}`} />
        <CornerFlourish className={`pointer-events-none absolute bottom-3 left-3 h-7 w-7 -scale-y-100 ${flourishClass}`} />
        <CornerFlourish className={`pointer-events-none absolute bottom-3 right-3 h-7 w-7 -scale-100 ${flourishClass}`} />

        <div className="relative z-10 px-2 sm:px-4">
          {/* Pinned marker + edit control */}
          {((topic.isPinned || topic.is_pinned) || (canEdit && !readOnly)) && (
            <div className="mb-1 flex items-center justify-between">
              {(topic.isPinned || topic.is_pinned) ? <Crown className="h-5 w-5 text-amber-600" /> : <span />}
              {canEdit && !readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-700"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Title */}
          <h2 className="mb-6 mt-2 text-center text-[26px] leading-tight text-gray-900 sm:text-3xl">
            {safeTitle}
          </h2>

          {/* Bible references sitting inside the open book */}
          {bibleReferences.length > 0 && (
            <div className="relative mx-auto mb-6 w-full max-w-[280px]">
              <OpenBook className={`mx-auto w-full ${bookClass}`} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-6 pb-4">
                {bibleReferences.map((ref, i) => (
                  <p key={i} className="text-center text-[15px] leading-snug text-gray-800 sm:text-base">{ref}</p>
                ))}
              </div>
            </div>
          )}

          {/* Optional freeform content / empty state */}
          {(safeContent || (!hasQuestions && bibleReferences.length === 0)) && (
            <p className={`mb-6 text-center text-[15px] leading-relaxed ${safeContent ? 'text-gray-700' : 'italic text-gray-500'}`}>
              {safeContent || 'Discussion details coming soon. Share your insights below.'}
            </p>
          )}

          {/* Discussion questions — classic disc bullets */}
          {hasQuestions && (
            <div className="mb-6">
              <ul className="mx-auto max-w-md list-disc space-y-1.5 pl-6 text-left text-[15px] leading-relaxed text-gray-800 marker:text-gray-400 sm:text-base">
                {(showAllQuestions ? translatedQuestions : translatedQuestions.slice(0, 3)).map((question: string, index: number) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
              {translatedQuestions.length > 3 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAllQuestions(!showAllQuestions); }}
                  className="mx-auto mt-3 flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                >
                  {showAllQuestions ? (
                    <><ChevronUp className="h-3 w-3" /><span>Show less</span></>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /><span>Show {translatedQuestions.length - 3} more</span></>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {topic.tags && topic.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              {topic.tags.map((tag: string, index: number) => (
                <span key={index} className="rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Author byline — clickable to open profile */}
          {(topic.authorName || topic.users?.name) && (
            <div className="mb-4 flex items-center justify-center gap-1.5 text-sm text-gray-500">
              <span>shared by</span>
              <button
                type="button"
                onClick={handleProfileClick}
                disabled={!onViewProfile || !authorId}
                className="font-semibold text-gray-700 hover:underline disabled:cursor-default disabled:no-underline disabled:hover:text-gray-700"
              >
                @{topic.users?.username || topic.authorName || topic.users?.name}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          {!readOnly && (
            <div className="flex items-center justify-center gap-6 border-t border-gray-200 pt-5">
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
                className="group flex flex-col items-center gap-1 text-gray-600 transition-colors hover:text-blue-600"
              >
                <div className="rounded-full p-2 transition-colors group-hover:bg-blue-100">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{commentCount}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onLike(); }}
                className={`group flex flex-col items-center gap-1 transition-colors ${isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}
              >
                <div className="rounded-full p-2 transition-colors group-hover:bg-red-100">
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                </div>
                <span className="text-xs font-medium">{topic.likes || 0}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onShare(); }}
                className="group flex flex-col items-center gap-1 text-gray-600 transition-colors hover:text-green-600"
              >
                <div className="rounded-full p-2 transition-colors group-hover:bg-green-100">
                  <Share2 className="h-5 w-5" />
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onBookmark(); }}
                className={`group flex flex-col items-center gap-1 transition-colors ${isBookmarked ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                <div className="rounded-full p-2 transition-colors group-hover:bg-blue-100">
                  <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                </div>
              </button>
            </div>
          )}

          {/* Comments Section */}
          {showComments && (
            <div className="mt-6 border-t border-gray-200 pt-5" onClick={(e) => e.stopPropagation()}>
              <CommentThread
                topicId={topic.id}
                onCommentAdded={handleCommentAdded}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Twitter Feed Style (clean, compact)
  return (
    <article className="px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors cursor-pointer" onClick={onView}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={handleProfileClick}
            disabled={!onViewProfile || !authorId}
            className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {(topic.authorName || topic.users?.name || 'A').charAt(0)}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 text-sm">
              <button
                type="button"
                onClick={handleProfileClick}
                disabled={!onViewProfile || !authorId}
                className="font-semibold text-gray-900 dark:text-white hover:underline truncate focus:outline-none disabled:no-underline"
              >
                {topic.authorName || topic.users?.name || 'Worship & Yapps'}
              </button>
              {(topic.authorUsername || topic.users?.username) && (
                <span className="text-gray-500 dark:text-gray-400 truncate">@{topic.authorUsername || topic.users?.username}</span>
              )}
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                {formatTimeAgo(topic.createdAt || topic.created_at)}
              </span>
              {(topic.isPinned || topic.is_pinned) && (
                <Crown className="w-3.5 h-3.5 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>

            {canEdit && !readOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1 text-gray-400 hover:text-blue-600 rounded-full flex-shrink-0"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Topic Title */}
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug mb-1">
            {safeTitle}
          </h2>

          {/* Bible Reference — inline, compact */}
          {safeBibleRef && (
            <button
              onClick={(e) => { e.stopPropagation(); openESV(safeBibleRef); }}
              className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 italic mb-1"
            >
              <BookOpen className="w-3 h-3" />
              {safeBibleRef}
            </button>
          )}

          {/* Content Preview */}
          <div className="mb-3">
            {safeContent && (
              <p className="text-gray-700 mb-3">
                {showFullContent ? safeContent : safeContent.substring(0, 200)}
                {safeContent.length > 200 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullContent(!showFullContent);
                    }}
                    className="text-blue-600 hover:text-blue-700 ml-1"
                  >
                    {showFullContent ? 'Show less' : '...Show more'}
                  </button>
                )}
              </p>
            )}

            {/* Questions Preview */}
            {hasQuestions && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-blue-900 mb-2">Discussion Questions:</p>
                <div className="space-y-2">
                  {(showAllQuestions ? translatedQuestions : translatedQuestions.slice(0, 1)).map((question: string, index: number) => (
                    <p key={index} className="text-sm text-blue-800 leading-relaxed">
                      <span className="font-medium">{index + 1}.</span> {question}
                    </p>
                  ))}
                </div>
                {translatedQuestions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllQuestions(!showAllQuestions);
                    }}
                    className="text-xs text-blue-600 mt-2 hover:text-blue-700 font-medium"
                  >
                    {showAllQuestions ? 'Show less' : `+${translatedQuestions.length - 1} more questions`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {topic.tags && topic.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {topic.tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="text-blue-600 hover:text-blue-700 text-sm cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center justify-between text-gray-500 text-sm mb-3">
            <div className="flex items-center space-x-4">
              <span>{commentCount} comments</span>
              <span>{topic.likes || 0} likes</span>
              <span>{topic.views || topic.view_count || 0} views</span>
            </div>
          </div>

          {/* Action Buttons */}
          {!readOnly && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments(!showComments);
                }}
                className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors group"
              >
                <div className="p-2 rounded-full group-hover:bg-blue-50">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-sm">{commentCount}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
                className={`flex items-center space-x-2 transition-colors group ${
                  isLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <div className="p-2 rounded-full group-hover:bg-red-50">
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </div>
                <span className="text-sm">{topic.likes || 0}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors group"
              >
                <div className="p-2 rounded-full group-hover:bg-green-50">
                  <Share2 className="w-4 h-4" />
                </div>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark();
                }}
                className={`flex items-center space-x-2 transition-colors group ${
                  isBookmarked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                }`}
              >
                <div className="p-2 rounded-full group-hover:bg-blue-50">
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </div>
              </button>
            </div>

            <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          )}

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
              <CommentThread
                topicId={topic.id}
                onCommentAdded={handleCommentAdded}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
