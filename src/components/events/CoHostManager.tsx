import React, { useState, useEffect } from 'react';
import { UserPlus, X, Shield, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface CoHost {
  id: string;
  user_id: string;
  user: {
    name: string;
    avatar_url?: string;
  };
}

interface Friend {
  id: string;
  name: string;
  avatar_url?: string;
}

interface CoHostManagerProps {
  eventId: string;
  isHost: boolean;
}

export const CoHostManager: React.FC<CoHostManagerProps> = ({ eventId, isHost }) => {
  const { user } = useAuth();
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const fetchCoHosts = async () => {
    try {
      const { data, error } = await supabase
        .from('event_cohosts')
        .select(`
          id,
          user_id,
          user:users!event_cohosts_user_id_fkey (
            name, avatar_url
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      setCoHosts((data || []) as CoHost[]);
    } catch (err) {
      console.error('Error fetching co-hosts:', err);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          connected_user:users!connections_connected_user_id_fkey (
            id, name, avatar_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setFriends((data || []).map((c: any) => c.connected_user).filter(Boolean));
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  useEffect(() => {
    fetchCoHosts();
    if (isHost) fetchFriends();
  }, [eventId, isHost]);

  const handleAdd = async (friendId: string) => {
    if (!user) return;
    setAdding(friendId);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_cohosts')
        .insert({ event_id: eventId, user_id: friendId, added_by: user.id });

      if (error) throw error;
      toast.success('Co-host added!');
      await fetchCoHosts();
      setShowAdd(false);
      setSearch('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add co-host');
    } finally {
      setAdding(null);
      setLoading(false);
    }
  };

  const handleRemove = async (coHostId: string) => {
    setRemoving(coHostId);
    try {
      const { error } = await supabase
        .from('event_cohosts')
        .delete()
        .eq('id', coHostId);

      if (error) throw error;
      toast.success('Co-host removed');
      setCoHosts(prev => prev.filter(c => c.id !== coHostId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove co-host');
    } finally {
      setRemoving(null);
    }
  };

  const coHostIds = new Set(coHosts.map(c => c.user_id));
  const availableFriends = friends.filter(
    f => !coHostIds.has(f.id) && f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          Co-Hosts
        </h3>
        {isHost && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Co-Host
          </button>
        )}
      </div>

      {coHosts.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No co-hosts assigned yet.</p>
      )}

      {coHosts.length > 0 && (
        <ul className="space-y-2 mb-3">
          {coHosts.map((coHost) => (
            <li key={coHost.id} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                {coHost.user?.avatar_url ? (
                  <img src={coHost.user.avatar_url} alt={coHost.user.name} className="w-full h-full object-cover" />
                ) : (
                  coHost.user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{coHost.user?.name}</span>
              {isHost && (
                <button
                  onClick={() => handleRemove(coHost.id)}
                  disabled={removing === coHost.id}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Remove co-host"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showAdd && isHost && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {availableFriends.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-2">
              {friends.length === 0 ? 'No connections to add' : 'All friends are already co-hosts or no matches'}
            </p>
          ) : (
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {availableFriends.map((friend) => (
                <li key={friend.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                    ) : (
                      friend.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{friend.name}</span>
                  <button
                    onClick={() => handleAdd(friend.id)}
                    disabled={adding === friend.id || loading}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline disabled:opacity-50"
                  >
                    {adding === friend.id ? 'Adding...' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
