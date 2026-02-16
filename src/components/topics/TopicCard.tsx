import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ExternalLink, ChevronDown, ChevronUp, Edit, Crown, BookOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { CommentThread } from './CommentThread';
import toast from 'react-hot-toast';

interface TopicCardProps {
  topic: any;
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onEdit: () => void;
  onView: () => void;
  cardStyle?: 'feed' | 'game';
  frameTone?: 'default' | 'gold';
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
  cardStyle = 'feed',
  frameTone = 'default'
}) => {
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
  const safeTitle =
    typeof topic.title === 'string' && topic.title.trim().length > 0 ? topic.title : 'Untitled Topic';
  const safeCategory =
    typeof topic.category === 'string' && topic.category.trim().length > 0 ? topic.category : 'general';
  const safeContent = typeof topic.content === 'string' ? topic.content.trim() : '';
  const hasQuestions = Array.isArray(topic.questions) && topic.questions.length > 0;

  const openBibleReference = (reference: string) => {
    const url = `https://www.openbible.info/labs/cross-references/search?q=${encodeURIComponent(reference)}`;
    window.open(url, '_blank');
  };

  const openESV = (reference: string) => {
    const url = `https://www.esv.org/${encodeURIComponent(reference.replace(/\s+/g, '+'))}/`;
    window.open(url, '_blank');
  };

  const formatTimeAgo = (dateString: string) => {
    return dateString || 'Just now';
  };

  const getQuestionPreview = () => {
    if (!topic.questions || topic.questions.length === 0) return '';
    const firstQuestion = topic.questions[0];
    return firstQuestion.length > 100 ? firstQuestion.substring(0, 100) + '...' : firstQuestion;
  };

  const canEdit = user && (
    topic.author_id === user.id ||
    topic.authorId === user.id ||
    (profile?.role === 'admin')
  );
  const isGoldFrame = cardStyle === 'game' && frameTone === 'gold';
  const frameBorderClass = isGoldFrame ? 'border-amber-500' : 'border-gray-800';
  const cornerBorderClass = isGoldFrame ? 'border-amber-500' : 'border-gray-800';
  const innerBorderClass = isGoldFrame ? 'border-amber-300' : 'border-gray-300';

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
  };

  if (cardStyle === 'game') {
    return (
      <div
        className={`bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-3xl shadow-2xl border-4 p-8 cursor-pointer transform transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden ${frameBorderClass}`}
        onClick={onView}
        style={{
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Decorative Corner Elements */}
        <div className={`absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl pointer-events-none ${cornerBorderClass}`}></div>
        <div className={`absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl pointer-events-none ${cornerBorderClass}`}></div>
        <div className={`absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl pointer-events-none ${cornerBorderClass}`}></div>
        <div className={`absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 rounded-br-2xl pointer-events-none ${cornerBorderClass}`}></div>

        {/* Decorative Inner Border */}
        <div className={`absolute top-4 left-4 right-4 bottom-4 border-2 border-dashed rounded-2xl pointer-events-none ${innerBorderClass}`}></div>

        {/* Card Header with Edit Button */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          {(topic.isPinned || topic.is_pinned) && (
            <Crown className="w-6 h-6 text-yellow-600" />
          )}
          <div className="flex-1"></div>
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-white/50 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Topic Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-4 leading-tight relative z-10" style={{ fontFamily: 'Georgia, serif' }}>
          {safeTitle}
        </h2>

        {/* Bible Reference */}
        {topic.bibleReference && (
          <div className="text-center mb-6 relative z-10">
            <p className="text-base text-gray-700 italic">
              {topic.bibleReference}
            </p>
          </div>
        )}

        {(safeContent || !hasQuestions) && (
          <div className="text-center mb-6 relative z-10">
            {safeContent ? (
              <p className="text-base text-gray-700 leading-relaxed">{safeContent}</p>
            ) : (
              <p className="text-base text-gray-500 italic">
                Discussion details coming soon. Share your insights below.
              </p>
            )}
          </div>
        )}

        {/* Discussion Questions */}
        {hasQuestions && (
          <div className="mb-6 relative z-10">
            <div className="space-y-2">
              {(showAllQuestions ? topic.questions : topic.questions.slice(0, 3)).map((question: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-gray-600 text-sm mt-0.5">•</span>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1">{question}</p>
                </div>
              ))}

              {topic.questions.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllQuestions(!showAllQuestions);
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 text-xs font-medium w-full justify-center py-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  {showAllQuestions ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      <span>Show Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      <span>Show {topic.questions.length - 3} More</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {topic.tags && topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 relative z-10 justify-center">
            {topic.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-gray-700 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-6 pt-6 border-t-2 border-gray-200 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
            }}
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors group"
          >
            <div className="p-2 rounded-full group-hover:bg-blue-100 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">{commentCount}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            className={`flex flex-col items-center space-y-1 transition-colors group ${
              isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
            }`}
          >
            <div className="p-2 rounded-full group-hover:bg-red-100 transition-colors">
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-xs font-medium">{topic.likes || 0}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-green-600 transition-colors group"
          >
            <div className="p-2 rounded-full group-hover:bg-green-100 transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark();
            }}
            className={`flex flex-col items-center space-y-1 transition-colors group ${
              isBookmarked ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <div className="p-2 rounded-full group-hover:bg-blue-100 transition-colors">
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </div>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-8 pt-6 border-t-2 border-gray-200 relative z-10" onClick={(e) => e.stopPropagation()}>
            <CommentThread
              topicId={topic.id}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        )}
      </div>
    );
  }

  // Twitter Feed Style (original)
  return (
    <article className="p-6 hover:bg-gray-50/50 transition-colors cursor-pointer bg-white/80 backdrop-blur-sm" onClick={onView}>
      <div className="flex space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {(topic.authorName || topic.users?.name || 'A').charAt(0)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 hover:underline">
                {topic.authorName || topic.users?.name || 'Anonymous'}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500 text-sm">
                {formatTimeAgo(topic.createdAt || topic.created_at)}
              </span>
              {(topic.isPinned || topic.is_pinned) && (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <Crown className="w-4 h-4 fill-current" />
                  <span className="text-xs font-medium">Pinned</span>
                </div>
              )}
            </div>

            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Topic Title */}
          <h2 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
            {safeTitle}
          </h2>

          {/* Category */}
          <div className="flex items-center space-x-3 mb-3">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {safeCategory.replace('-', ' ').toUpperCase()}
            </span>
          </div>

          {/* Bible Reference */}
          {topic.bibleReference && (
            <div className="mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Scripture</span>
              </div>
              <p className="font-bold text-amber-900 mb-2">{topic.bibleReference}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openESV(topic.bibleReference);
                  }}
                  className="inline-flex items-center space-x-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 transition-all text-xs font-medium"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Read ESV</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openBibleReference(topic.bibleReference);
                  }}
                  className="inline-flex items-center space-x-1.5 bg-white text-amber-700 px-3 py-1.5 rounded-md hover:bg-amber-50 transition-all border border-amber-300 text-xs font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Cross References</span>
                </button>
              </div>
            </div>
          )}

          {/* Content Preview */}
          <div className="mb-3">
            {safeContent ? (
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
            ) : (
              <p className="text-gray-500 italic">
                No description provided yet. Jump into the questions or comments to start the discussion.
              </p>
            )}

            {/* Questions Preview */}
            {hasQuestions && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-blue-900 mb-2">Discussion Questions:</p>
                <div className="space-y-2">
                  {(showAllQuestions ? topic.questions : topic.questions.slice(0, 1)).map((question: string, index: number) => (
                    <p key={index} className="text-sm text-blue-800 leading-relaxed">
                      <span className="font-medium">{index + 1}.</span> {question}
                    </p>
                  ))}
                </div>
                {topic.questions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllQuestions(!showAllQuestions);
                    }}
                    className="text-xs text-blue-600 mt-2 hover:text-blue-700 font-medium"
                  >
                    {showAllQuestions ? 'Show less' : `+${topic.questions.length - 1} more questions`}
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
