import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, ExternalLink, Send } from 'lucide-react';
import { Topic } from '../../data/topics';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface FullScreenCardProps {
  topic: Topic;
  currentIndex: number;
  totalTopics: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onLike: (id: string) => void;
  isLiked: boolean;
}

export const FullScreenCard: React.FC<FullScreenCardProps> = ({
  topic,
  currentIndex,
  totalTopics,
  onClose,
  onNext,
  onPrevious,
  onLike,
  isLiked
}) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newReply, setNewReply] = useState<{[key: string]: string}>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px)`;
      cardRef.current.style.opacity = `${1 - Math.abs(diff) / 300}`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const diff = currentX.current - startX.current;
    
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
    }
    
    if (Math.abs(diff) > 100) {
      if (diff > 0 && currentIndex > 0) {
        onPrevious();
      } else if (diff < 0 && currentIndex < totalTopics - 1) {
        onNext();
      }
    }
  };

  const openBibleReference = (reference: string) => {
    const cleanRef = reference.replace(/[;,]/g, '').split(' ')[0];
    const url = `https://www.openbible.info/topics/${cleanRef.toLowerCase()}`;
    window.open(url, '_blank');
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'You',
      content: newComment,
      timestamp: new Date().toLocaleString(),
      replies: []
    };

    setComments([...comments, comment]);
    setNewComment('');
    toast.success('Comment added!');
  };

  const handleAddReply = (commentId: string) => {
    const replyContent = newReply[commentId];
    if (!replyContent?.trim()) return;

    const reply: Reply = {
      id: Date.now().toString(),
      author: 'You',
      content: replyContent,
      timestamp: new Date().toLocaleString()
    };

    setComments(comments.map(comment =>
      comment.id === commentId
        ? { ...comment, replies: [...comment.replies, reply] }
        : comment
    ));

    setNewReply({ ...newReply, [commentId]: '' });
    toast.success('Reply added!');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white">
        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
          <X size={24} />
        </button>
        <span className="text-lg font-medium">
          {currentIndex + 1} of {totalTopics}
        </span>
        <div className="w-10" />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          ref={cardRef}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Card Header */}
          <div className="p-6 text-center border-b">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">WnY</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{topic.title}</h2>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {topic.category.replace('-', ' ').toUpperCase()}
            </span>
          </div>

          {/* Bible Reference */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Bible Reference:</p>
                <p className="text-sm text-gray-800">{topic.bibleReference}</p>
              </div>
              <button
                onClick={() => openBibleReference(topic.bibleReference)}
                className="flex items-center text-blue-600 hover:text-blue-700 text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                OpenBible
              </button>
            </div>
          </div>

          {/* Questions */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-3">Discussion Questions:</h3>
            <div className="space-y-3">
              {topic.questions.map((question, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-800">• {question}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t flex justify-between items-center">
            <button
              onClick={() => onLike(topic.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isLiked ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{topic.likes}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-600"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{comments.length}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-600">
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center p-4">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="p-3 bg-white/20 rounded-full text-white disabled:opacity-50"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-white text-center">
          <p className="text-sm opacity-75">Swipe left/right to navigate</p>
        </div>

        <button
          onClick={onNext}
          disabled={currentIndex === totalTopics - 1}
          className="p-3 bg-white/20 rounded-full text-white disabled:opacity-50"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-10">
          <div className="bg-white w-full max-h-[70vh] rounded-t-3xl p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Comments</h3>
              <button onClick={() => setShowComments(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Add Comment */}
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-sm">{comment.author}</span>
                    <span className="text-xs text-gray-500">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                  
                  {/* Replies */}
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="ml-4 mt-2 p-2 bg-gray-50 rounded">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-xs">{reply.author}</span>
                        <span className="text-xs text-gray-500">{reply.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-600">{reply.content}</p>
                    </div>
                  ))}
                  
                  {/* Add Reply */}
                  <div className="flex space-x-2 mt-2">
                    <input
                      type="text"
                      placeholder="Reply..."
                      value={newReply[comment.id] || ''}
                      onChange={(e) => setNewReply({...newReply, [comment.id]: e.target.value})}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                    />
                    <button
                      onClick={() => handleAddReply(comment.id)}
                      className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
              
              {comments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};