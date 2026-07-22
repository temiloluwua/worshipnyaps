import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Search, Plus, Send, Image, Smile,
  MoreHorizontal, Check, CheckCheck, X, Users as UsersIcon, Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDirectMessages, Conversation, DirectMessage } from '../../hooks/useDirectMessages';
import { useAuth } from '../../hooks/useAuth';
import { useConnections } from '../../hooks/useConnections';
import { linkifyMessage } from '../../lib/linkify';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { Modal } from '../ui/Modal';
import { ReportButton } from '../moderation/ReportButton';

interface MessagesViewProps {
  onBack?: () => void;
  initialUserId?: string;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  onBack,
  initialUserId
}) => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    totalUnread,
    fetchMessages,
    sendMessage,
    startConversation,
    createGroupConversation
  } = useDirectMessages();
  const { connections, blockUser, unblockUser, isBlocked } = useConnections();

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUserId) {
      startConversation(initialUserId);
    }
  }, [initialUserId, startConversation]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    const content = messageInput.trim();
    setMessageInput('');
    await sendMessage(activeConversation.id, content);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
  };

  const handleStartNewConversation = async (userId: string) => {
    await startConversation(userId);
    setShowNewMessage(false);
  };

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find(p => p.user_id !== user?.id)?.user;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  };

  const filteredConversations = conversations.filter(conv => {
    // Hide 1:1 conversations with blocked users from the list.
    if (!conv.is_group) {
      const other = getOtherParticipant(conv);
      if (other?.id && isBlocked(other.id)) return false;
    }
    if (!searchQuery) return true;
    const otherUser = getOtherParticipant(conv);
    return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (activeConversation) {
    const otherUser = getOtherParticipant(activeConversation);
    const otherUserId = otherUser?.id;
    const otherBlocked = otherUserId ? isBlocked(otherUserId) : false;

    const handleBlockToggle = async () => {
      if (!otherUserId) return;
      setShowConvMenu(false);
      if (otherBlocked) {
        await unblockUser(otherUserId);
        return;
      }
      if (!window.confirm(
        `Block ${otherUser?.name || 'this user'}? You won't see their messages and they won't be able to message you.`
      )) return;
      await blockUser(otherUserId);
      setActiveConversation(null);
    };

    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveConversation(null)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center flex-1">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 mr-3">
              {otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {otherUser?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {activeConversation.is_group
                  ? activeConversation.name
                  : otherUser?.name || 'Unknown'}
              </h2>
            </div>
          </div>
          {!activeConversation.is_group && otherUserId && (
            <div className="relative">
              <button
                onClick={() => setShowConvMenu((v) => !v)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Conversation options"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              {showConvMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowConvMenu(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                    <button
                      onClick={handleBlockToggle}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      {otherBlocked ? 'Unblock user' : 'Block user'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, idx) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = !isOwn && (
              idx === 0 ||
              messages[idx - 1].sender_id !== message.sender_id
            );

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwn && showAvatar && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 mr-2 flex-shrink-0">
                    {message.sender?.avatar_url ? (
                      <img
                        src={message.sender.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                        {message.sender?.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                )}
                {!isOwn && !showAvatar && <div className="w-8 mr-2" />}
                <div className="group/msg flex items-center gap-1 max-w-[75%] sm:max-w-[65%]">
                  <div
                    className={`flex-1 min-w-0 rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{linkifyMessage(message.content || '', isOwn)}</p>
                    <div className={`flex items-center justify-end space-x-1 mt-1 ${
                      isOwn ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      <span className="text-xs">
                        {format(new Date(message.created_at), 'h:mm a')}
                      </span>
                      {isOwn && (
                        message.is_read
                          ? <CheckCheck className="w-3 h-3" />
                          : <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                  {!isOwn && (
                    <ReportButton
                      target={{
                        type: 'message',
                        id: message.id,
                        authorId: message.sender_id,
                        preview: message.content?.slice(0, 200),
                        contentSnapshot: { content: message.content, sender_name: message.sender?.name },
                      }}
                      className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-all"
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {showEmojis && (
            <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 grid grid-cols-10 gap-1 text-2xl">
              {['😀','😂','🥰','😍','😎','🙏','🤔','😢','😡','👍','👎','❤️','🔥','✨','🙌','💯','🎉','📖','✝️','⛪'].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setMessageInput(prev => prev + e); }}
                  className="aspect-square rounded hover:bg-white dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 bg-transparent py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowEmojis((v) => !v)}
                className={`p-2 transition-colors ${showEmojis ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                aria-label="Insert emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Messages
          </h1>
          {totalUnread > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewGroup(true)}
            title="New group chat"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <UsersIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setShowNewMessage(true)}
            title="New message"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No conversations yet
            </p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredConversations.map(conv => {
              const otherUser = getOtherParticipant(conv);
              const lastMessage = conv.last_message;

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600">
                      {otherUser?.avatar_url ? (
                        <img
                          src={otherUser.avatar_url}
                          alt={otherUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {otherUser?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 ml-3 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold truncate ${
                        conv.unread_count > 0
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {conv.is_group ? conv.name : otherUser?.name || 'Unknown'}
                      </p>
                      {lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                          {formatMessageTime(lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    {lastMessage && (
                      <p className={`text-sm truncate ${
                        conv.unread_count > 0
                          ? 'text-gray-900 dark:text-gray-200 font-medium'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {lastMessage.sender_id === user?.id ? 'You: ' : ''}
                        {lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showNewMessage && (
        <NewMessageModal
          onClose={() => setShowNewMessage(false)}
          onSelectUser={handleStartNewConversation}
          connections={connections}
        />
      )}

      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          connections={connections}
          onCreate={async (name, ids) => {
            const conv = await createGroupConversation(name, ids);
            if (conv) {
              setActiveConversation(conv);
              setShowNewGroup(false);
              toast.success('Group chat created');
            }
          }}
        />
      )}
    </div>
  );
};

interface NewMessageModalProps {
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  connections: any[];
}

const NewMessageModal: React.FC<NewMessageModalProps> = ({
  onClose,
  onSelectUser,
  connections
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConnections = connections.filter(conn =>
    conn.connected_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="New Message">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filteredConnections.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No connections found
            </p>
          ) : (
            <div className="space-y-1">
              {filteredConnections.map(conn => (
                <button
                  key={conn.id}
                  onClick={() => onSelectUser(conn.connected_user_id)}
                  className="w-full flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 mr-3">
                    {conn.connected_user?.avatar_url ? (
                      <img
                        src={conn.connected_user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold">
                        {conn.connected_user?.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {conn.connected_user?.name || 'Unknown'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

interface NewGroupModalProps {
  onClose: () => void;
  connections: any[];
  onCreate: (name: string, participantIds: string[]) => Promise<void>;
}

const NewGroupModal: React.FC<NewGroupModalProps> = ({ onClose, connections, onCreate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const filteredConnections = connections.filter(conn =>
    conn.connected_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const canCreate = groupName.trim().length > 0 && selectedIds.size >= 2;

  const handleCreate = async () => {
    if (!canCreate || submitting) return;
    setSubmitting(true);
    try {
      await onCreate(groupName.trim(), Array.from(selectedIds));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="New Group Chat">
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Group name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Saturday Bible Study"
            maxLength={60}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Add friends ({selectedIds.size} selected — need at least 2)
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto -mx-1 px-1">
            {filteredConnections.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
                {connections.length === 0
                  ? "Add friends in the Community tab before creating a group."
                  : 'No connections match your search.'}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredConnections.map(conn => {
                  const userId = conn.connected_user_id;
                  const selected = selectedIds.has(userId);
                  return (
                    <button
                      key={conn.id}
                      type="button"
                      onClick={() => toggleSelect(userId)}
                      className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                        selected
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 mr-3 flex-shrink-0">
                        {conn.connected_user?.avatar_url ? (
                          <img src={conn.connected_user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {conn.connected_user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {conn.connected_user?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create group'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
