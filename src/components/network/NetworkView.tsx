import React, { useState } from 'react';
import { Users, MessageCircle, Heart, Share2, UserPlus, Search, Filter, CheckCircle, X } from 'lucide-react';
import { useConnections } from '../../hooks/useConnections';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export function CommunityView() {
  const { user } = useAuth();
  const { connections, connectionRequests, sendConnectionRequest, acceptConnectionRequest, declineConnectionRequest } = useConnections();
  const [activeFilter, setActiveFilter] = useState('all');
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [showMessageModal, setShowMessageModal] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  // Mock data for demo - in production this would come from the database
  const networkMembers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Bible Study Leader',
      church: 'Grace Community Church',
      interests: ['Prayer', 'Worship', 'Youth Ministry'],
      mutualConnections: 12,
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: true
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Worship Leader',
      church: 'New Life Fellowship',
      interests: ['Music', 'Discipleship', 'Community'],
      mutualConnections: 8,
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: false
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      role: 'Small Group Coordinator',
      church: 'Hillside Baptist',
      interests: ['Teaching', 'Outreach', 'Prayer'],
      mutualConnections: 15,
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: true
    },
    {
      id: 4,
      name: 'David Kim',
      role: 'Professional Yapper',
      church: 'Calgary Christian Centre',
      interests: ['Great Conversations', 'Deep Questions', 'Community Building'],
      mutualConnections: 6,
      avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: true
    },
    {
      id: 5,
      name: 'Jessica Park',
      role: 'Community Yapper',
      church: 'Bow Valley Church',
      interests: ['Meaningful Discussions', 'Asking Great Questions', 'Building Connections'],
      mutualConnections: 9,
      avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: true
    }
  ];

  const filters = [
    { id: 'all', label: 'All', count: networkMembers.length },
    { id: 'leaders', label: 'Leaders', count: 3 },
    { id: 'online', label: 'Online', count: 3 },
    { id: 'nearby', label: 'Nearby', count: 2 }
  ];

  const handleConnect = (memberId: number) => {
    if (!user) {
      toast.error('Please sign in to connect with others');
      return;
    }

    // In production, this would use the real sendConnectionRequest function
    // sendConnectionRequest(memberId.toString());
    setPendingRequests(prev => new Set(prev).add(memberId.toString()));
    toast.success('Connection request sent!');

    // Simulate acceptance for demo
    setTimeout(() => {
      setPendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId.toString());
        return newSet;
      });
      toast.success('Connection request accepted!');
    }, 2000);
  };

  const handleMessage = (memberId: number) => {
    if (!user) {
      toast.error('Please sign in to send messages');
      return;
    }
    setShowMessageModal(memberId.toString());
  };

  const sendMessage = () => {
    if (!messageText.trim()) return;
    toast.success('Message sent!');
    setShowMessageModal(null);
    setMessageText('');
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Community</h1>
        <p className="text-gray-600">Connect with fellow believers in Calgary</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search members..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Network Members */}
      <div className="space-y-4">
        {networkMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                {member.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  {false ? ( // In production: connections.some(c => c.connected_user_id === member.id.toString())
                    <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Connected</span>
                    </div>
                  ) : pendingRequests.has(member.id.toString()) ? (
                    <div className="flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      <span>Pending...</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleConnect(member.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>

                <p className="text-blue-600 font-medium mb-1">{member.role}</p>
                <p className="text-gray-600 text-sm mb-3">{member.church}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {member.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {member.mutualConnections} mutual connections
                  </p>

                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => handleMessage(member.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">Message</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors">
                      <Heart className="w-4 h-4" />
                    </button>
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Join Community CTA */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white text-center">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-90" />
        <h3 className="text-xl font-bold mb-2">Grow Your Faith Community</h3>
        <p className="mb-4 opacity-90">
          Connect with believers, join study groups, and build lasting friendships
        </p>
        <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
          Invite Friends
        </button>
      </div>
      </div>
      
      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Send Message</h3>
              <button onClick={() => setShowMessageModal(null)}>
                <X size={20} />
              </button>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowMessageModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendMessage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}