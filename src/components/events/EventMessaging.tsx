import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Users, X, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isHost: boolean;
  readBy: string[];
}

interface EventMessagingProps {
  eventId: string;
  eventTitle: string;
  attendees: Array<{
    id: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
  }>;
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
}

export const EventMessaging: React.FC<EventMessagingProps> = ({
  eventId,
  eventTitle,
  attendees,
  currentUserId,
  isHost,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'host-1',
      senderName: 'Sarah Johnson',
      content: 'Welcome everyone! Looking forward to our Bible study tonight. Please bring your Bibles and come ready for great discussion!',
      timestamp: '2 hours ago',
      isHost: true,
      readBy: ['user-1', 'user-2']
    },
    {
      id: '2',
      senderId: 'user-1',
      senderName: 'Michael Chen',
      content: 'Thanks Sarah! Should I bring anything for snacks?',
      timestamp: '1 hour ago',
      isHost: false,
      readBy: ['host-1']
    },
    {
      id: '3',
      senderId: 'host-1',
      senderName: 'Sarah Johnson',
      content: 'That would be wonderful Michael! Maybe some cookies or fruit would be perfect.',
      timestamp: '45 minutes ago',
      isHost: true,
      readBy: ['user-1']
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: isHost ? 'You (Host)' : 'You',
      content: newMessage,
      timestamp: 'Just now',
      isHost: isHost,
      readBy: []
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    toast.success('Message sent!');

    // Simulate typing indicator
    if (!isHost) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        // Simulate host response
        const hostResponse: Message = {
          id: (Date.now() + 1).toString(),
          senderId: 'host-1',
          senderName: 'Sarah Johnson',
          content: 'Thanks for the message! See you tonight!',
          timestamp: 'Just now',
          isHost: true,
          readBy: []
        };
        setMessages(prev => [...prev, hostResponse]);
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{eventTitle}</h2>
            <p className="text-sm text-gray-600 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {attendees.length} attendees
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Attendees List */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Attendees:</h3>
          <div className="flex flex-wrap gap-2">
            {attendees.map((attendee) => (
              <div key={attendee.id} className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full text-sm">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {attendee.name.charAt(0)}
                </div>
                <span className={attendee.isHost ? 'font-medium text-blue-600' : 'text-gray-700'}>
                  {attendee.name} {attendee.isHost && '(Host)'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === currentUserId
                  ? 'bg-blue-600 text-white'
                  : message.isHost
                  ? 'bg-green-100 text-green-900 border border-green-200'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${
                    message.senderId === currentUserId ? 'text-blue-100' : 'text-gray-600'
                  }`}>
                    {message.senderName}
                  </span>
                  <span className={`text-xs ${
                    message.senderId === currentUserId ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
                {message.senderId === currentUserId && (
                  <div className="flex items-center justify-end mt-1">
                    <CheckCircle className="w-3 h-3 text-blue-200" />
                    <span className="text-xs text-blue-200 ml-1">
                      Read by {message.readBy.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Host is typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              placeholder={isHost ? "Send a message to all attendees..." : "Send a message to the host..."}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          {isHost && (
            <div className="mt-2 text-xs text-gray-500">
              💡 As the host, your messages will be highlighted and sent to all attendees
            </div>
          )}
        </div>
      </div>
    </div>
  );
};