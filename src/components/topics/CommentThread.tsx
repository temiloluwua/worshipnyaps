import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTopics } from '../../hooks/useTopics';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  likes: number;
  replies: Comment[];
  isLiked?: boolean;
  parentId?: string;
  depth?: number;
}

interface CommentThreadProps {
  topicId: string;
  onCommentAdded: () => void;
}

const formatRelativeTime = (dateString?: string | null) => {
  if (!dateString) return 'Just now';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
};

const buildCommentTree = (rows: any[]): Comment[] => {
  const normalized = rows.map((row) => ({
    id: row.id,
    content: row.content ?? '',
    author: {
      id: row.author_id,
      name: row.users?.name || 'Community Member',
      avatar: row.users?.avatar_url || undefined,
    },
    timestamp: formatRelativeTime(row.created_at),
    likes: row.likes ?? 0,
    replies: [],
    parentId: row.parent_id ?? null,
    depth: 0,
  }));

  const map = new Map<string, Comment>();
  normalized.forEach((comment) => {
    map.set(comment.id, comment);
  });

  const roots: Comment[] = [];

  normalized.forEach((comment) => {
    if (comment.parentId && map.has(comment.parentId)) {
      const parent = map.get(comment.parentId)!;
      comment.depth = Math.min((parent.depth ?? 0) + 1, 3);
      parent.replies = [...parent.replies, comment];
    } else {
      roots.push(comment);
    }
  });

  return roots;
};

export const CommentThread: React.FC<CommentThreadProps> = ({ topicId, onCommentAdded }) => {
  const { user, profile } = useAuth();
  const { getTopicComments, addComment } = useTopics();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadComments = useCallback(async (withSpinner: boolean = true) => {
    if (withSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const rows = await getTopicComments(topicId);
      setComments(buildCommentTree(rows));
      setError(null);
    } catch (err) {
      console.error('Error loading comments', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      if (withSpinner) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [topicId, getTopicComments]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    setSubmittingComment(true);
    const saved = await addComment(topicId, newComment);
    if (saved) {
      setNewComment('');
      await loadComments(false);
      onCommentAdded();
    }
    setSubmittingComment(false);
  };

  const handleAddReply = async (parentId: string, depth: number = 0) => {
    if (!replyText.trim()) return;
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    setSubmittingReply(true);
    const saved = await addComment(topicId, replyText, parentId);
    if (saved) {
      setReplyText('');
      setReplyingTo(null);
      await loadComments(false);
      toast.success('Reply added!');
    }
    setSubmittingReply(false);
  };

  const handleLikeComment = (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });

    // Update comment likes count recursively
    const updateLikes = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: likedComments.has(commentId) ? comment.likes - 1 : comment.likes + 1
          };
        }
        if (comment.replies.length > 0) {
          return { ...comment, replies: updateLikes(comment.replies) };
        }
        return comment;
      });
    };

    setComments(prev => updateLikes(prev));
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => {
    const isExpanded = expandedThreads.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    const maxDepth = 3;
    
    return (
      <div className={`${isReply ? 'ml-6 mt-3' : 'mb-6'} ${comment.depth && comment.depth > 0 ? 'border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="flex space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.author.avatar ? (
              <img
                src={comment.author.avatar}
                alt={comment.author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {comment.author.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-2">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">{comment.author.name}</span>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-gray-500 text-xs">{comment.timestamp}</span>
              </div>
              <p className="text-gray-800 text-sm leading-relaxed">{comment.content}</p>
            </div>

            {/* Comment Actions */}
            <div className="flex items-center space-x-4 mb-2">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center space-x-1 transition-colors group ${
                  likedComments.has(comment.id) ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <div className="p-1 rounded-full group-hover:bg-red-50">
                  <Heart className={`w-4 h-4 ${likedComments.has(comment.id) ? 'fill-current' : ''}`} />
                </div>
                <span className="text-xs">{comment.likes}</span>
              </button>

      {(comment.depth ?? 0) < maxDepth && (
        <button
          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors group"
        >
                  <div className="p-1 rounded-full group-hover:bg-blue-50">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xs">Reply</span>
                </button>
              )}

              {hasReplies && (
                <button
                  onClick={() => toggleThread(comment.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="text-xs">
                    {isExpanded ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                </button>
              )}

              <button className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div className="mt-3 flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(profile?.name || 'Y').charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex space-x-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.author.name}...`}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={2}
                    />
                    <button
                      onClick={() => handleAddReply(comment.id, comment.depth ?? 0)}
                      disabled={!replyText.trim() || submittingReply}
                      className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-start space-x-2 mt-2">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Replies */}
            {hasReplies && (isExpanded || expandedThreads.has(comment.id) || comment.replies.length <= 2) && (
              <div className="mt-3">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} isReply={true} />
                ))}
              </div>
            )}

            {/* Show More Replies Button */}
            {hasReplies && !isExpanded && !expandedThreads.has(comment.id) && comment.replies.length > 2 && (
              <button
                onClick={() => toggleThread(comment.id)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Show {comment.replies.length} more replies
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
          {error}
        </div>
      )}

      {refreshing && !loading && (
        <div className="text-xs text-gray-500 text-center">Updating comments...</div>
      )}

      {/* Add Comment */}
      {user ? (
        <div className="flex space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
            {(profile?.name || 'Y').charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts on this topic..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submittingComment}
                className="px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-xl">
          <p className="text-gray-600 text-sm">Sign in to join the discussion</p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-500">Loading comments...</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}

          {comments.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
