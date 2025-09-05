import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Reply, Trash2, Edit, Flag, Send } from 'lucide-react';
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

export const CommentThread: React.FC<CommentThreadProps> = ({ topicId, onCommentAdded }) => {
  const { user, profile } = useAuth();
  const { getTopicComments, addComment } = useTopics();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Mock comments with deeper threading for demo
  useEffect(() => {
    const mockComments: Comment[] = [
      {
        id: '1',
        content: 'This is such a thought-provoking question! I think pretty privilege is definitely real, but as Christians we\'re called to look beyond the surface and see people as God sees them. What do you all think?',
        author: {
          id: 'user-1',
          name: 'Sarah Johnson',
          avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop'
        },
        timestamp: '2h',
        likes: 12,
        depth: 0,
        replies: [
          {
            id: '1-1',
            content: 'Absolutely agree! 1 Samuel 16:7 comes to mind - "The Lord does not look at the things people look at. People look at the outward appearance, but the Lord looks at the heart."',
            author: {
              id: 'user-2',
              name: 'Michael Chen'
            },
            timestamp: '1h',
            likes: 8,
            depth: 1,
            replies: [
              {
                id: '1-1-1',
                content: 'That verse is perfect for this discussion! It really challenges us to examine our own hearts and how we view others.',
                author: {
                  id: 'user-5',
                  name: 'David Park'
                },
                timestamp: '45m',
                likes: 3,
                depth: 2,
                replies: [],
                parentId: '1-1'
              }
            ],
            parentId: '1'
          },
          {
            id: '1-2',
            content: 'This is so true. I struggle with this sometimes when I catch myself making assumptions about people based on how they look. It\'s a daily choice to see with God\'s eyes.',
            author: {
              id: 'user-3',
              name: 'Emily Rodriguez'
            },
            timestamp: '45m',
            likes: 5,
            depth: 1,
            replies: [
              {
                id: '1-2-1',
                content: '@Emily Rodriguez I feel the same way! It\'s encouraging to know we\'re all growing in this together.',
                author: {
                  id: 'user-6',
                  name: 'Jessica Kim'
                },
                timestamp: '30m',
                likes: 2,
                depth: 2,
                replies: [],
                parentId: '1-2'
              }
            ],
            parentId: '1'
          }
        ]
      },
      {
        id: '2',
        content: 'I love how this connects to our identity in Christ. When we know who we are in Him, external validation becomes less important. But it\'s still a struggle sometimes!',
        author: {
          id: 'user-4',
          name: 'David Kim'
        },
        timestamp: '1h',
        likes: 7,
        depth: 0,
        replies: [
          {
            id: '2-1',
            content: 'Yes! Ephesians 2:10 says we are God\'s handiwork. That should be enough validation for anyone.',
            author: {
              id: 'user-7',
              name: 'Mark Johnson'
            },
            timestamp: '30m',
            likes: 4,
            depth: 1,
            replies: [],
            parentId: '2'
          }
        ]
      }
    ];
    setComments(mockComments);
  }, [topicId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: {
        id: user.id,
        name: profile?.name || 'You'
      },
      timestamp: 'now',
      likes: 0,
      depth: 0,
      replies: []
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
    onCommentAdded();
    toast.success('Comment added!');
  };

  const handleAddReply = async (parentId: string, depth: number = 0) => {
    if (!replyText.trim()) return;
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    const reply: Comment = {
      id: Date.now().toString(),
      content: replyText,
      author: {
        id: user.id,
        name: profile?.name || 'You'
      },
      timestamp: 'now',
      likes: 0,
      depth: Math.min(depth + 1, 3), // Max depth of 3
      replies: [],
      parentId
    };

    // Add reply to the correct parent comment
    const addReplyToComment = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === parentId) {
          return { ...comment, replies: [...comment.replies, reply] };
        }
        if (comment.replies.length > 0) {
          return { ...comment, replies: addReplyToComment(comment.replies) };
        }
        return comment;
      });
    };

    setComments(prev => addReplyToComment(prev));
    setReplyText('');
    setReplyingTo(null);
    toast.success('Reply added!');
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
                      disabled={!replyText.trim()}
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
                disabled={!newComment.trim()}
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
    </div>
  );
};
