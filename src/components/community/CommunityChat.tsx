import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, User } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

interface CommunityChatProps {
  channel?: string;
}

export const CommunityChat: React.FC<CommunityChatProps> = ({ channel = 'community' }) => {
  const { user, profile } = useAuth();
  const { messages, loading, sending, sendMessage, deleteMessage } = useChat(channel);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage;
    setNewMessage('');
    await sendMessage(messageContent);
    inputRef.current?.focus();
  };

  const handleDelete = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl">
        <User className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-600 text-center">Sign in to join the conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-end gap-2">
                    {!isOwn && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {message.sender?.avatar_url ? (
                          <img
                            src={message.sender.avatar_url}
                            alt={message.sender.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-xs font-medium">
                            {message.sender?.name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                    )}
                    <div>
                      {!isOwn && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">
                          {message.sender?.name || 'Anonymous'}
                        </p>
                      )}
                      <div
                        className={`group relative px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        {isOwn && (
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-full"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                        {format(new Date(message.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
