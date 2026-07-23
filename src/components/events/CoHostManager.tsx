import React, { useState, useEffect } from 'react';
import { UserPlus, X, Shield, Search, Copy, Music, BookOpen, Heart, Coffee, Wrench, MoreHorizontal, Link2, Check, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import toast from 'react-hot-toast';

type RoleKey = 'worship' | 'discussion' | 'prayer' | 'hospitality' | 'tech' | 'other';

const ROLES: Record<RoleKey, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  worship:     { label: 'Worship',         description: 'open with a few songs (~15 min)', icon: Music },
  discussion:  { label: 'Bible Discussion', description: 'lead the Bible study / discussion', icon: BookOpen },
  prayer:      { label: 'Prayer',          description: 'lead opening or closing prayer', icon: Heart },
  hospitality: { label: 'Hospitality',     description: 'welcome people and handle food / drinks', icon: Coffee },
  tech:        { label: 'Tech / Setup',    description: 'handle sound, lights, and room setup', icon: Wrench },
  other:       { label: 'Other',           description: 'help lead a part of the gathering', icon: MoreHorizontal },
};

interface CoHost {
  id: string;
  user_id: string;
  can_edit?: boolean;
  role?: RoleKey | null;
  custom_role_label?: string | null;
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

interface PendingRequest {
  id: string;
  user_id: string;
  role?: RoleKey | null;
  custom_role_label?: string | null;
  user: { name: string; avatar_url?: string } | null;
}

interface CoHostManagerProps {
  eventId: string;
  isHost: boolean;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  hostName?: string;
  hostIsVerified?: boolean;
  hostId?: string;
  hostAvatarUrl?: string;
  onViewProfile?: (userId: string) => void;
}

function formatEventDateTime(date?: string, time?: string): string {
  if (!date) return '';
  try {
    const d = new Date(`${date}T${time || '00:00'}`);
    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (!time) return dateStr;
    const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return `${date}${time ? ` at ${time}` : ''}`;
  }
}

function buildInviteMessage(opts: {
  friendName: string;
  hostName?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventId: string;
  roleLabel: string;
  roleDescription: string;
}): string {
  const when = formatEventDateTime(opts.eventDate, opts.eventTime);
  const link = `https://www.worshipnyaps.com/event/${opts.eventId}`;
  const greeting = opts.friendName ? `Hey ${opts.friendName.split(' ')[0]}!` : 'Hey!';
  const eventLabel = opts.eventTitle ? `*${opts.eventTitle}*` : 'a gathering';
  const whenStr = when ? ` on ${when}` : '';
  const sig = opts.hostName ? `\n— ${opts.hostName.split(' ')[0]}` : '';
  return `${greeting} I'm hosting ${eventLabel}${whenStr} — would you lead our *${opts.roleLabel}* portion? You'd ${opts.roleDescription}.\n\nDetails + RSVP: ${link}${sig}`;
}

export const CoHostManager: React.FC<CoHostManagerProps> = ({ eventId, isHost, eventTitle, eventDate, eventTime, hostName, hostIsVerified, hostId, hostAvatarUrl, onViewProfile }) => {
  const { user } = useAuth();
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [grantEdit, setGrantEdit] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleKey>('discussion');
  const [customLabel, setCustomLabel] = useState('');
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
          can_edit,
          role,
          custom_role_label,
          user:users!event_cohosts_user_id_fkey (
            name, avatar_url
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      setCoHosts((data || []) as unknown as CoHost[]);
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

  const fetchPending = async () => {
    if (!isHost) return;
    try {
      const { data, error } = await supabase
        .from('event_cohost_requests')
        .select('id, user_id, role, custom_role_label, user:users!event_cohost_requests_user_id_fkey(name, avatar_url)')
        .eq('event_id', eventId);
      if (error) throw error;
      setPending((data || []) as unknown as PendingRequest[]);
    } catch (err) {
      console.error('Error fetching co-host requests:', err);
    }
  };

  const fetchTeamCode = async () => {
    if (!isHost) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('team_code')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      setTeamCode((data as { team_code?: string })?.team_code || null);
    } catch (err) {
      console.error('Error fetching team code:', err);
    }
  };

  useEffect(() => {
    fetchCoHosts();
    if (isHost) {
      fetchFriends();
      fetchPending();
      fetchTeamCode();
    }
  }, [eventId, isHost]);

  // Inside the native app window.location.origin is capacitor://localhost,
  // which is not a shareable URL. Fall back to the real site for the native
  // app AND local dev so shared links always resolve for the recipient.
  const teamOrigin = (() => {
    try {
      const origin = window.location.origin;
      return origin.startsWith('capacitor://') || origin.startsWith('http://localhost') || origin.startsWith('https://localhost')
        ? 'https://www.worshipnyaps.com'
        : origin;
    } catch {
      return 'https://www.worshipnyaps.com';
    }
  })();

  const shareTeamLink = async () => {
    if (!teamCode) {
      toast.error('Team link not ready yet — try again in a moment.');
      return;
    }
    const link = `${teamOrigin}/event/${eventId}?team=${teamCode}`;
    const when = formatEventDateTime(eventDate, eventTime);
    const msg = `Help me run ${eventTitle ? `*${eventTitle}*` : 'my event'}${when ? ` on ${when}` : ''}! Grab a role (lead a part, volunteer, or bring something):\n${link}`;
    await shareInvite(msg, 'Team link copied — paste to send.');
  };

  const shareRoleLink = async (roleKey: RoleKey) => {
    if (!teamCode) {
      toast.error('Team link not ready yet — try again in a moment.');
      return;
    }
    const link = `${teamOrigin}/event/${eventId}?team=${teamCode}&pick=cohost:${roleKey}`;
    const label = ROLES[roleKey].label;
    const when = formatEventDateTime(eventDate, eventTime);
    const msg = `Would you lead *${label}* at ${eventTitle ? `*${eventTitle}*` : 'my event'}${when ? ` on ${when}` : ''}? Tap to join the team:\n${link}`;
    await shareInvite(msg, 'Role link copied — paste to send.');
  };

  const handleApprove = async (req: PendingRequest) => {
    setActingOn(req.id);
    try {
      const { error } = await supabase.rpc('approve_cohost_request', { p_request_id: req.id });
      if (error) throw error;
      toast.success(`${req.user?.name?.split(' ')[0] || 'They'} is now a co-host`);
      setPending(prev => prev.filter(p => p.id !== req.id));
      await fetchCoHosts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setActingOn(null);
    }
  };

  const handleDecline = async (req: PendingRequest) => {
    setActingOn(req.id);
    try {
      const { error } = await supabase.from('event_cohost_requests').delete().eq('id', req.id);
      if (error) throw error;
      setPending(prev => prev.filter(p => p.id !== req.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline');
    } finally {
      setActingOn(null);
    }
  };

  const roleLabelFor = (c: { role?: RoleKey | null; custom_role_label?: string | null }): string | null => {
    if (!c.role) return null;
    if (c.role === 'other') return c.custom_role_label || 'Other';
    return ROLES[c.role]?.label || null;
  };

  // Open the native share sheet so the host can actually send the invite
  // (Messages, WhatsApp, etc.). Falls back to copying to the clipboard.
  const shareInvite = async (message: string, copiedMsg: string) => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: message });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // user dismissed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      toast.success(copiedMsg);
    } catch {
      toast.error('Could not share the invite');
    }
  };

  const handleAddAndCopy = async (friend: Friend) => {
    if (!user) return;
    setAdding(friend.id);
    setLoading(true);
    try {
      const isOther = selectedRole === 'other';
      const customTrim = customLabel.trim();
      const { error } = await supabase
        .from('event_cohosts')
        .insert({
          event_id: eventId,
          user_id: friend.id,
          added_by: user.id,
          can_edit: grantEdit,
          role: selectedRole,
          custom_role_label: isOther && customTrim ? customTrim : null,
        });

      if (error) throw error;

      const roleLabel = isOther ? (customTrim || 'a portion') : ROLES[selectedRole].label;
      const roleDescription = isOther ? 'help lead a part of the gathering' : ROLES[selectedRole].description;

      const message = buildInviteMessage({
        friendName: friend.name,
        hostName,
        eventTitle,
        eventDate,
        eventTime,
        eventId,
        roleLabel,
        roleDescription,
      });

      toast.success(`Added ${friend.name.split(' ')[0]} as co-host`);
      await shareInvite(message, 'Invite copied — paste to send.');

      await fetchCoHosts();
      setShowAdd(false);
      setSearch('');
      setGrantEdit(false);
      setCustomLabel('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add co-host');
    } finally {
      setAdding(null);
      setLoading(false);
    }
  };

  const handleCopyInvite = async (coHost: CoHost) => {
    if (!coHost.role) {
      toast.error('No role assigned yet');
      return;
    }
    const isOther = coHost.role === 'other';
    const roleLabel = isOther ? (coHost.custom_role_label || 'a portion') : ROLES[coHost.role].label;
    const roleDescription = isOther ? 'help lead a part of the gathering' : ROLES[coHost.role].description;
    const message = buildInviteMessage({
      friendName: coHost.user?.name || '',
      hostName,
      eventTitle,
      eventDate,
      eventTime,
      eventId,
      roleLabel,
      roleDescription,
    });
    await shareInvite(message, 'Invite copied. Paste in iMessage to send.');
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
          Hosts
        </h3>
        {isHost && (
          <div className="flex items-center gap-3">
            <button
              onClick={shareTeamLink}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              title="Share a link so anyone can grab a role"
            >
              <Link2 className="w-3.5 h-3.5" />
              Share team link
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Co-Host
            </button>
          </div>
        )}
      </div>

      {isHost && pending.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending co-host requests
          </p>
          {pending.map((req) => {
            const label = req.role === 'other' ? (req.custom_role_label || 'Other') : (req.role ? ROLES[req.role]?.label : null);
            return (
              <div key={req.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                  {req.user?.avatar_url ? <img src={req.user.avatar_url} alt="" className="w-full h-full object-cover" /> : (req.user?.name?.charAt(0).toUpperCase() || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{req.user?.name || 'Someone'}</div>
                  {label && <div className="text-[11px] text-amber-700 dark:text-amber-300">wants to lead {label}</div>}
                </div>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={actingOn === req.id}
                  className="p-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  title="Approve"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDecline(req)}
                  disabled={actingOn === req.id}
                  className="p-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-red-600 disabled:opacity-50"
                  title="Decline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ul className="space-y-2 mb-3">
        {hostId && hostName && (
          <li className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewProfile ? () => onViewProfile(hostId) : undefined}
              disabled={!onViewProfile}
              className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity disabled:hover:opacity-100"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                {hostAvatarUrl ? (
                  <img src={hostAvatarUrl} alt={hostName} className="w-full h-full object-cover" />
                ) : (
                  hostName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{hostName}</span>
                  <VerifiedBadge verified={hostIsVerified} size={14} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    Host
                  </span>
                </div>
              </div>
            </button>
          </li>
        )}

        {coHosts.map((coHost) => {
          const roleLabel = roleLabelFor(coHost);
          const RoleIcon = coHost.role && coHost.role !== 'other' ? ROLES[coHost.role].icon : null;
          return (
            <li key={coHost.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={onViewProfile ? () => onViewProfile(coHost.user_id) : undefined}
                disabled={!onViewProfile}
                className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity disabled:hover:opacity-100"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                  {coHost.user?.avatar_url ? (
                    <img src={coHost.user.avatar_url} alt={coHost.user.name} className="w-full h-full object-cover" />
                  ) : (
                    coHost.user?.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{coHost.user?.name}</span>
                    {roleLabel && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {RoleIcon && <RoleIcon className="w-2.5 h-2.5" />}
                        {roleLabel}
                      </span>
                    )}
                    {coHost.can_edit && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        Editor
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {isHost && coHost.role && (
                <button
                  onClick={() => handleCopyInvite(coHost)}
                  className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  title="Copy invite message"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
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
          );
        })}
      </ul>

      {coHosts.length === 0 && !showAdd && isHost && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tap "Add Co-Host" to invite people to lead specific parts.</p>
      )}

      {showAdd && isHost && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-3">
          {/* What co-hosts can do */}
          <div className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 leading-relaxed">
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Co-hosts can:</p>
            <ul className="space-y-0.5">
              <li>✓ Post announcements & message attendees</li>
              <li>✓ Mark people as attended</li>
              <li>✓ Assign help / food requests</li>
              <li>✓ Use the organizer chat</li>
            </ul>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              By default, only you (the host) can edit, cancel, or postpone. Toggle "Can edit event" to give the same powers as you.
            </p>
          </div>

          {/* Role picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              What part will they lead?
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(ROLES) as RoleKey[]).map((key) => {
                const Icon = ROLES[key].icon;
                const active = selectedRole === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedRole(key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                      active
                        ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 font-semibold'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-center leading-tight">{ROLES[key].label}</span>
                  </button>
                );
              })}
            </div>
            {selectedRole === 'other' && (
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder='e.g. "Greeter", "Childcare", "Snacks"'
                maxLength={40}
                className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            )}
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
              Adding will copy a pre-written invite message to your clipboard — paste it into iMessage or WhatsApp.
            </p>
            <button
              type="button"
              onClick={() => shareRoleLink(selectedRole)}
              disabled={selectedRole === 'other' && !customLabel.trim()}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-purple-300 dark:border-purple-700 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50"
            >
              <Link2 className="w-3.5 h-3.5" />
              Share a link for this role (anyone can accept)
            </button>
          </div>

          <label className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={grantEdit}
              onChange={(e) => setGrantEdit(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-800 dark:text-gray-200">
              Can edit / cancel / postpone the event
            </span>
          </label>

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
                    onClick={() => handleAddAndCopy(friend)}
                    disabled={adding === friend.id || loading || (selectedRole === 'other' && !customLabel.trim())}
                    className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    {adding === friend.id ? 'Adding...' : 'Add + copy invite'}
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
