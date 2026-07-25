import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Megaphone, Users, MessageCircle, Share2, LogOut, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useGroups, Group, GroupMember, GroupAnnouncement } from '../../hooks/useGroups';
import { shareUrl } from '../../lib/openExternal';
import { linkifyMessage } from '../../lib/linkify';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
  onViewProfile?: (userId: string) => void;
  // When arriving via an invite link (/group/{id}?join={code}).
  joinCode?: string | null;
  onRequireAuth?: () => void;
}

type Tab = 'chat' | 'announcements' | 'members';

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ groupId, onBack, onViewProfile, joinCode, onRequireAuth }) => {
  const { user } = useAuth();
  const { fetchGroup, fetchMembers, fetchAnnouncements, postAnnouncement, leaveGroup, removeMember, joinGroup } = useGroups();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [tab, setTab] = useState<Tab>('chat');
  const [loading, setLoading] = useState(true);
  const [announceText, setAnnounceText] = useState('');

  const isLeader = members.some(m => m.user_id === user?.id && m.role === 'leader') || group?.created_by === user?.id;

  const load = useCallback(async () => {
    setLoading(true);
    let g = await fetchGroup(groupId);
    // Arrived via an invite link and not a member yet → join, then load.
    if (!g && joinCode && user) {
      const ok = await joinGroup(groupId, joinCode);
      if (ok) g = await fetchGroup(groupId);
    }
    const [m, a] = g ? await Promise.all([fetchMembers(groupId), fetchAnnouncements(groupId)]) : [[], []];
    setGroup(g); setMembers(m); setAnnouncements(a);
    setLoading(false);
  }, [groupId, joinCode, user, fetchGroup, fetchMembers, fetchAnnouncements, joinGroup]);

  useEffect(() => { load(); }, [load]);

  const share = async () => {
    if (!group) return;
    const url = shareUrl(`/group/${group.id}?join=${group.join_code}`);
    const msg = `Join our group "${group.name}" on Worship N Yaps:\n${url}`;
    try {
      if (typeof navigator.share === 'function') { await navigator.share({ title: group.name, text: msg, url }); return; }
      await navigator.clipboard.writeText(msg);
      toast.success('Invite link copied — paste to share.');
    } catch (e: any) { if (e?.name !== 'AbortError') toast.error('Could not share'); }
  };

  const handlePost = async () => {
    if (!announceText.trim()) return;
    const ok = await postAnnouncement(groupId, announceText.trim());
    if (ok) { setAnnounceText(''); toast.success('Announcement posted'); setAnnouncements(await fetchAnnouncements(groupId)); }
  };

  if (loading && !group) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600" /></div>;
  }
  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4 p-6 text-center">
        {joinCode && !user ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Users className="w-7 h-7 text-blue-600 dark:text-blue-400" /></div>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">You've been invited to join a group. Sign up (free) to join and start chatting.</p>
            <button onClick={() => onRequireAuth?.()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">Sign up to join</button>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Group not found or you're not a member.</p>
        )}
        <button onClick={onBack} className="text-blue-600 hover:underline text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
            {group.avatar_url ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" /> : group.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-gray-900 dark:text-white truncate">{group.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} member{members.length === 1 ? '' : 's'}</p>
          </div>
          <button onClick={share} title="Share invite link" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><Share2 className="w-5 h-5" /></button>
        </div>
        <div className="flex px-2">
          <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageCircle className="w-4 h-4" />} label="Chat" />
          <TabBtn active={tab === 'announcements'} onClick={() => setTab('announcements')} icon={<Megaphone className="w-4 h-4" />} label="Announcements" />
          <TabBtn active={tab === 'members'} onClick={() => setTab('members')} icon={<Users className="w-4 h-4" />} label="Members" />
        </div>
      </div>

      {tab === 'chat' && (
        group.conversation_id
          ? <GroupChat conversationId={group.conversation_id} />
          : <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Chat unavailable.</div>
      )}

      {tab === 'announcements' && (
        <div className="flex-1 overflow-y-auto max-w-2xl w-full mx-auto p-4 space-y-3">
          {isLeader && (
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <textarea value={announceText} onChange={e => setAnnounceText(e.target.value)} rows={2} maxLength={500}
                placeholder="Post an announcement to the whole group…"
                className="w-full text-sm bg-transparent text-gray-900 dark:text-white resize-none focus:outline-none" />
              <div className="flex justify-end">
                <button onClick={handlePost} disabled={!announceText.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full disabled:opacity-50">Post</button>
              </div>
            </div>
          )}
          {announcements.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No announcements yet.</p>
          ) : announcements.map(a => (
            <div key={a.id} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{a.author?.name || 'Leader'}</span>
                <span className="text-xs text-gray-400">· {format(new Date(a.created_at), 'MMM d')}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'members' && (
        <div className="flex-1 overflow-y-auto max-w-2xl w-full mx-auto p-4">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            {members.map(m => (
              <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => onViewProfile?.(m.user_id)} disabled={!onViewProfile} className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-default">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden">
                    {m.user?.avatar_url ? <img src={m.user.avatar_url} alt="" className="w-full h-full object-cover" /> : (m.user?.name?.charAt(0).toUpperCase() || '?')}
                  </div>
                  <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{m.user?.name || 'Member'}</span>
                </button>
                {m.role === 'leader' && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Leader</span>}
                {isLeader && m.user_id !== user?.id && (
                  <button onClick={async () => { if (await removeMember(groupId, m.user_id)) setMembers(prev => prev.filter(x => x.user_id !== m.user_id)); }}
                    className="p-1 text-gray-400 hover:text-red-500" title="Remove"><X className="w-4 h-4" /></button>
                )}
              </li>
            ))}
          </ul>
          <button onClick={async () => { if (window.confirm('Leave this group?') && await leaveGroup(groupId)) onBack(); }}
            className="mt-4 w-full py-2.5 border border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="w-4 h-4" /> Leave group
          </button>
        </div>
      )}
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium relative ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
    {icon}<span>{label}</span>
    {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
  </button>
);

interface ChatMsg { id: string; sender_id: string; content: string | null; created_at: string; sender?: { name: string; avatar_url?: string } | null }

// Self-contained group chat over the group's linked conversation. Uses the
// same direct_messages table as DMs, with its own realtime subscription.
const GroupChat: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('direct_messages')
      .select('id, sender_id, content, created_at, sender:users!direct_messages_sender_fkey (name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (active) setMessages((data || []) as unknown as ChatMsg[]); });

    const channel = supabase
      .channel(`group-chat-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as ChatMsg;
          // Skip our own optimistic echo.
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row]);
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput(''); setSending(true);
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, content })
        .select('id, sender_id, content, created_at')
        .single();
      if (error) throw error;
      setMessages(prev => prev.some(m => m.id === (data as any).id) ? prev : [...prev, data as ChatMsg]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send');
      setInput(content);
    } finally { setSending(false); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <p className="text-center text-sm text-gray-400 py-10">Say hello 👋 — this is your group's chat.</p>}
        {messages.map((m, i) => {
          const own = m.sender_id === user?.id;
          const showName = !own && (i === 0 || messages[i - 1].sender_id !== m.sender_id);
          return (
            <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {showName && <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5 ml-1">{m.sender?.name || 'Member'}</p>}
                <div className={`rounded-2xl px-4 py-2 ${own ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'}`}>
                  <p className="whitespace-pre-wrap break-words text-sm">{linkifyMessage(m.content || '', own)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message the group…" className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none" />
          <button onClick={send} disabled={!input.trim() || sending} className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};
