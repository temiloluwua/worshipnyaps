import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ExternalLink, ChevronDown, ChevronUp, Edit, Eye, Crown } from 'lucide-react';
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
  cardStyle = 'feed'
}) => {
  const { user, profile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(topic.comments || 0);

  const openBibleReference = (reference: string) => {
    const cleanRef = reference.replace(/[;,]/g, '').split(' ')[0];
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=NIV`;
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

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
  };

  if (cardStyle === 'game') {
    return (
      <div 
        className="bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl shadow-xl border border-gray-200 p-6 cursor-pointer transform transition-all duration-300 hover:shadow-2xl relative overflow-hidden"
        onClick={onView}
      >
        {/* Card Game Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-4 w-8 h-8 border-2 border-blue-300 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-6 h-6 border-2 border-purple-300 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-gray-300 rounded-lg rotate-45"></div>
        </div>

        {/* Card Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {(topic.authorName || topic.users?.name || 'A').charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                {topic.authorName || topic.users?.name || 'Anonymous'}
              </div>
              <div className="text-sm text-blue-600 font-medium">
                {topic.category.replace('-', ' ').toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {(topic.isPinned || topic.is_pinned) && (
              <Crown className="w-5 h-5 text-yellow-500" />
            )}
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
        </div>

        {/* Topic Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight relative z-10">
          {topic.title}
        </h2>

        {/* Bible Reference */}
        {topic.bibleReference && (
          <div className="mb-4 relative z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openBibleReference(topic.bibleReference);
              }}
              className="inline-flex items-center space-x-2 bg-white/80 text-blue-700 px-4 py-2 rounded-xl hover:bg-white hover:shadow-md transition-all border border-blue-200"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="font-medium">{topic.bibleReference}</span>
            </button>
          </div>
        )}

        {/* Content Preview */}
        {topic.content && (
          <div className="mb-4 relative z-10">
            <div className="bg-white/60 rounded-xl p-4 border border-white/50">
              <p className="text-gray-700 leading-relaxed">
                {showFullContent ? topic.content : topic.content.substring(0, 150)}
                {topic.content.length > 150 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullContent(!showFullContent);
                    }}
                    className="text-blue-600 hover:text-blue-700 ml-1 font-medium"
                  >
                    {showFullContent ? ' Show less' : '... Show more'}
                  </button>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Discussion Questions */}
        {topic.questions && topic.questions.length > 0 && (
          <div className="mb-4 relative z-10">
            <div className="bg-white/80 rounded-xl p-4 border border-white/50 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-purple-600" />
                Discussion Questions
              </h3>
              
              <div className="space-y-3">
                {(showAllQuestions ? topic.questions : topic.questions.slice(0, 2)).map((question: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-800 text-sm leading-relaxed">{question}</p>
                  </div>
                ))}
                
                {topic.questions.length > 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllQuestions(!showAllQuestions);
                    }}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium w-full justify-center py-2 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    {showAllQuestions ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Show {topic.questions.length - 2} More Questions</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {topic.tags && topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 relative z-10">
            {topic.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200 hover:from-blue-200 hover:to-purple-200 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/50 relative z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors group"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-100 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="font-medium">{commentCount}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className={`flex items-center space-x-2 transition-colors group ${
                isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <div className="p-2 rounded-full group-hover:bg-red-100 transition-colors">
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </div>
              <span className="font-medium">{topic.likes || 0}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors group"
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
              className={`flex items-center space-x-2 transition-colors group ${
                isBookmarked ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <div className="p-2 rounded-full group-hover:bg-blue-100 transition-colors">
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-6 pt-6 border-t border-white/50 relative z-10" onClick={(e) => e.stopPropagation()}>
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
            {topic.title}
          </h2>

          {/* Category and Bible Reference */}
          <div className="flex items-center space-x-3 mb-3">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {topic.category.replace('-', ' ').toUpperCase()}
            </span>
            {topic.bibleReference && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openBibleReference(topic.bibleReference);
                }}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{topic.bibleReference}</span>
              </button>
            )}
          </div>

          {/* Content Preview */}
          <div className="mb-3">
            {topic.content && (
              <p className="text-gray-700 mb-3">
                {showFullContent ? topic.content : topic.content.substring(0, 200)}
                {topic.content.length > 200 && (
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
            {topic.questions && topic.questions.length > 0 && (
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
