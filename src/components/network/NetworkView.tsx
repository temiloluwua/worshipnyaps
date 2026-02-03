import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, UserPlus, Search, CheckCircle, X, UserMinus, Send, Calendar, Clock, MapPin, Bell, ChevronRight } from 'lucide-react';
import { useConnections } from '../../hooks/useConnections';
import { useAuth } from '../../hooks/useAuth';
import { useEventInvitations } from '../../hooks/useEventInvitations';
import { useEvents } from '../../hooks/useEvents';
import { CommunityChat } from '../community/CommunityChat';
import { supabase, UserProfile } from '../../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type TabType = 'discover' | 'friends' | 'chat' | 'invitations';

interface CommunityViewProps {
  onViewProfile?: (userId: string) => void;
  onStartChat?: (userId: string) => void;
}

export function CommunityView({ onViewProfile, onStartChat }: CommunityViewProps = {}) {
  const { user, profile } = useAuth();
  const { connections, connectionRequests, sendConnectionRequest, acceptConnectionRequest, declineConnectionRequest, removeConnection, loading: connectionsLoading } = useConnections();
  const { invitations, sentInvitations, respondToInvitation, cancelInvitation } = useEventInvitations();
  const { events } = useEvents();
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [inviteMessage, setInviteMessage] = useState('');

  const pendingIncoming = connectionRequests.filter(r => r.to_user_id === user?.id && r.status === 'pending');
  const pendingOutgoing = connectionRequests.filter(r => r.from_user_id === user?.id && r.status === 'pending');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', user.id)
          .order('name');
        if (error) throw error;
        setAllUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [user]);

  const connectedUserIds = connections.map(c => c.connected_user_id);
  const pendingUserIds = connectionRequests.map(r => r.from_user_id === user?.id ? r.to_user_id : r.from_user_id);

  const discoverUsers = allUsers.filter(u =>
    !connectedUserIds.includes(u.id) &&
    (searchQuery ? u.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  const friendsList = allUsers.filter(u => connectedUserIds.includes(u.id));

  const handleConnect = async (userId: string) => {
    await sendConnectionRequest(userId);
  };

  const { sendInvitation } = useEventInvitations();

  const handleInviteToEvent = async () => {
    if (!showInviteModal || !selectedEvent) return;
    await sendInvitation(selectedEvent, showInviteModal, inviteMessage);
    setShowInviteModal(null);
    setSelectedEvent('');
    setInviteMessage('');
  };

  const tabs: Array<{ id: TabType; label: string; icon: typeof Search; count?: number }> = [
    { id: 'discover', label: 'Discover', icon: Search, count: discoverUsers.length },
    { id: 'friends', label: 'Friends', icon: Users, count: friendsList.length },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'invitations', label: 'Invitations', icon: Bell, count: invitations.length + pendingIncoming.length }
  ];

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join the Community</h2>
          <p className="text-gray-600 mb-6">Sign in to connect with fellow believers, chat, and get invited to events.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Community</h1>
          <p className="text-gray-600">Connect with fellow believers</p>
        </div>

        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center space-x-2 flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'discover' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {pendingIncoming.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Pending Friend Requests ({pendingIncoming.length})
                </h3>
                <div className="space-y-3">
                  {pendingIncoming.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden">
                          {request.from_user?.avatar_url ? (
                            <img src={request.from_user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-medium">{request.from_user?.name?.[0] || '?'}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{request.from_user?.name || 'Unknown'}</p>
                          {request.message && <p className="text-sm text-gray-500">{request.message}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptConnectionRequest(request.id)}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => declineConnectionRequest(request.id)}
                          className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : discoverUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No new people to discover</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {discoverUsers.map((member) => {
                  const isPending = pendingUserIds.includes(member.id);
                  return (
                    <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-lg font-medium">{member.name[0].toUpperCase()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                            {isPending ? (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConnect(member.id)}
                                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                <UserPlus className="w-4 h-4" />
                                Connect
                              </button>
                            )}
                          </div>
                          <p className="text-blue-600 font-medium text-sm mb-1 capitalize">{member.role}</p>
                          {member.bio && <p className="text-gray-600 text-sm line-clamp-2">{member.bio}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-4">
            {friendsList.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 mb-2">No friends yet</p>
                <p className="text-sm text-gray-500">Discover and connect with people in the community</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Find People
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {friendsList.map((friend) => (
                  <div key={friend.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center overflow-hidden">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-lg font-medium">{friend.name[0].toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{friend.name}</h3>
                        <p className="text-green-600 text-sm font-medium capitalize">{friend.role}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowInviteModal(friend.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          <Calendar className="w-4 h-4" />
                          Invite
                        </button>
                        <button
                          onClick={() => {
                            const conn = connections.find(c => c.connected_user_id === friend.id);
                            if (conn) removeConnection(conn.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <UserMinus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div>
            <CommunityChat />
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="space-y-6">
            {invitations.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Event Invitations</h3>
                <div className="space-y-3">
                  {invitations.map((inv: any) => (
                    <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{inv.event?.title}</h4>
                          <p className="text-sm text-gray-500 mb-1">
                            Invited by {inv.inviter?.name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {inv.event?.date && format(new Date(inv.event.date), 'MMM d')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {inv.event?.time}
                            </span>
                          </div>
                          {inv.message && (
                            <p className="mt-2 text-sm text-gray-600 italic">"{inv.message}"</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => respondToInvitation(inv.id, true)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondToInvitation(inv.id, false)}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingIncoming.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Friend Requests</h3>
                <div className="space-y-3">
                  {pendingIncoming.map((request: any) => (
                    <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden">
                          {request.from_user?.avatar_url ? (
                            <img src={request.from_user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-medium">{request.from_user?.name?.[0] || '?'}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{request.from_user?.name}</p>
                          <p className="text-sm text-gray-500">Wants to connect</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptConnectionRequest(request.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => declineConnectionRequest(request.id)}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invitations.length === 0 && pendingIncoming.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No pending invitations</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invite to Event</h3>
              <button onClick={() => setShowInviteModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Event
                </label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose an event...</option>
                  {upcomingEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {format(new Date(event.date), 'MMM d')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteModal(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteToEvent}
                  disabled={!selectedEvent}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
