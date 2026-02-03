import React, { useState } from 'react';
import {
  X, Repeat, MessageSquare, Link2, Copy, Check,
  Send, Twitter, Facebook
} from 'lucide-react';
import { Topic } from '../../lib/supabase';
import { useReposts } from '../../hooks/useReposts';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

interface ShareModalProps {
  topic: Topic;
  onClose: () => void;
  onStartChat?: (userId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  topic,
  onClose,
  onStartChat
}) => {
  const { createRepost, hasReposted } = useReposts();
  const [quoteText, setQuoteText] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/topic/${topic.id}`;
  const shareText = `Check out "${topic.title}" on Worship and Yapps`;

  const handleRepost = async () => {
    if (hasReposted(topic.id)) {
      toast.error('You have already reposted this');
      return;
    }
    await createRepost(topic.id);
    onClose();
  };

  const handleQuotePost = async () => {
    if (!quoteText.trim()) {
      toast.error('Please add a comment');
      return;
    }
    await createRepost(topic.id, quoteText.trim());
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShareExternal = (platform: 'twitter' | 'facebook') => {
    let url = '';

    if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    }

    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Share Post">
      <div className="p-6">

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="font-medium text-gray-900 dark:text-white line-clamp-2">
            {topic.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {topic.content}
          </p>
        </div>

        <div className="space-y-3">
          {!showQuoteInput && (
            <>
              <button
                onClick={handleRepost}
                disabled={hasReposted(topic.id)}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg transition-colors ${
                  hasReposted(topic.id)
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                <Repeat className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Repost</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hasReposted(topic.id) ? 'Already reposted' : 'Share to your profile'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowQuoteInput(true)}
                className="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Quote</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add your thoughts and share
                  </p>
                </div>
              </button>
            </>
          )}

          {showQuoteInput && (
            <div className="space-y-3">
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Add your thoughts..."
                rows={3}
                maxLength={280}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowQuoteInput(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {quoteText.length}/280
                  </span>
                  <button
                    onClick={handleQuotePost}
                    disabled={!quoteText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Quote
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showQuoteInput && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-600 my-4"></div>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <div className="text-left flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {copied ? 'Copied!' : 'Copy Link'}
                  </p>
                </div>
                <Copy className="w-4 h-4 text-gray-400" />
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleShareExternal('twitter')}
                  className="flex-1 flex items-center justify-center space-x-2 p-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                  <span className="font-medium">Twitter</span>
                </button>

                <button
                  onClick={() => handleShareExternal('facebook')}
                  className="flex-1 flex items-center justify-center space-x-2 p-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                  <span className="font-medium">Facebook</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
