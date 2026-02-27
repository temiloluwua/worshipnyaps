import React, { useState } from 'react';
import { X, Heart, Share2, Bookmark, BookOpen, ExternalLink, MessageCircle, ChevronDown, ChevronUp, Edit, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { CommentThread } from './CommentThread';

interface TopicDetailModalProps {
  topic: any;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onEdit: () => void;
}

export const TopicDetailModal: React.FC<TopicDetailModalProps> = ({
  topic,
  isOpen,
  onClose,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onShare,
  onEdit,
}) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(
    typeof topic?.commentCount === 'number' ? topic.commentCount :
    typeof topic?.comments === 'number' ? topic.comments :
    Array.isArray(topic?.comments) ? topic.comments.length : 0
  );

  if (!isOpen || !topic) return null;

  const safeTitle = typeof topic.title === 'string' && topic.title.trim().length > 0 ? topic.title : t('topics.untitled');
  const safeCategory = typeof topic.category === 'string' && topic.category.trim().length > 0 ? topic.category : 'general';
  const safeContent = typeof topic.content === 'string' ? topic.content.trim() : '';
  const hasQuestions = Array.isArray(topic.questions) && topic.questions.length > 0;
  const canEdit = user && (topic.author_id === user.id || topic.authorId === user.id || profile?.role === 'admin');

  const openBibleReference = (reference: string) => {
    window.open(`https://www.openbible.info/labs/cross-references/search?q=${encodeURIComponent(reference)}`, '_blank');
  };

  const openESV = (reference: string) => {
    window.open(`https://www.esv.org/${encodeURIComponent(reference.replace(/\s+/g, '+'))}/`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {(topic.isPinned || topic.is_pinned) && <Crown className="w-5 h-5 text-yellow-500 fill-current" />}
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
              {safeCategory.replace('-', ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {(topic.authorName || topic.users?.name || 'A').charAt(0)}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {topic.authorName || topic.users?.name || 'Anonymous'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {topic.createdAt || topic.created_at || 'Just now'}
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{safeTitle}</h1>

            {topic.bibleReference && (
              <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Scripture</span>
                </div>
                <p className="font-bold text-amber-900 dark:text-amber-200 mb-3">{topic.bibleReference}</p>
                {topic.bible_verse_text && (
                  <blockquote className="border-l-4 border-amber-300 dark:border-amber-600 pl-4 mb-3 italic text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                    {topic.bible_verse_text}
                  </blockquote>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openESV(topic.bibleReference)}
                    className="inline-flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 transition-colors text-xs font-medium"
                  >
                    <BookOpen className="w-3 h-3" />
                    Read ESV
                  </button>
                  <button
                    onClick={() => openBibleReference(topic.bibleReference)}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-gray-600 transition-colors border border-amber-300 dark:border-amber-700 text-xs font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Cross References
                  </button>
                </div>
              </div>
            )}

            {safeContent && (
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{safeContent}</p>
              </div>
            )}

            {hasQuestions && (
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">Discussion Questions</h3>
                <div className="space-y-2">
                  {(showAllQuestions ? topic.questions : topic.questions.slice(0, 3)).map((q: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
                {topic.questions.length > 3 && (
                  <button
                    onClick={() => setShowAllQuestions(!showAllQuestions)}
                    className="mt-3 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    {showAllQuestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showAllQuestions ? t('common.showLess') : `${topic.questions.length - 3} more questions`}
                  </button>
                )}
              </div>
            )}

            {topic.tags && topic.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {topic.tags.map((tag: string, i: number) => (
                  <span key={i} className="text-blue-600 dark:text-blue-400 text-sm hover:underline cursor-pointer">#{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span>{commentCount} comments</span>
              <span>{topic.likes || 0} likes</span>
              <span>{topic.views || topic.view_count || 0} views</span>
            </div>

            <div className="flex items-center gap-4 border-t border-b border-gray-200 dark:border-gray-700 py-3 mb-6">
              <button
                onClick={onLike}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isLiked ? 'text-red-600' : 'text-gray-500 dark:text-gray-400 hover:text-red-600'}`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                {topic.likes || 0}
              </button>
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-green-600 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                {t('events.share')}
              </button>
              <button
                onClick={onBookmark}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isBookmarked ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600'}`}
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                <MessageCircle className="w-4 h-4" />
                Comments ({commentCount})
              </h3>
              <CommentThread topicId={topic.id} onCommentAdded={() => setCommentCount(c => c + 1)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
