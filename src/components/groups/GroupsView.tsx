import React, { useState } from 'react';
import { ArrowLeft, Plus, Users, Link2, X } from 'lucide-react';
import { useGroups } from '../../hooks/useGroups';
import toast from 'react-hot-toast';

interface GroupsViewProps {
  onBack?: () => void;
  onOpenGroup: (groupId: string) => void;
}

// Pull the group id + join code out of a pasted /group/{id}?join={code} link.
function parseGroupLink(input: string): { id: string; code: string } | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const m = url.pathname.match(/\/group\/([^/]+)/);
    const code = url.searchParams.get('join');
    if (m && code) return { id: decodeURIComponent(m[1]), code };
  } catch {
    // not a full URL — fall through
  }
  const m = trimmed.match(/group\/([0-9a-f-]{36}).*[?&]join=([a-z0-9]+)/i);
  if (m) return { id: m[1], code: m[2] };
  return null;
}

export const GroupsView: React.FC<GroupsViewProps> = ({ onBack, onOpenGroup }) => {
  const { groups, loading, createGroup, joinGroup } = useGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Give your group a name'); return; }
    setBusy(true);
    const id = await createGroup(name.trim(), description.trim() || undefined);
    setBusy(false);
    if (id) {
      setShowCreate(false);
      setName(''); setDescription('');
      onOpenGroup(id);
    }
  };

  const handleJoin = async () => {
    const parsed = parseGroupLink(linkInput);
    if (!parsed) { toast.error('Paste a valid group invite link'); return; }
    setBusy(true);
    const ok = await joinGroup(parsed.id, parsed.code);
    setBusy(false);
    if (ok) {
      setShowJoin(false);
      setLinkInput('');
      onOpenGroup(parsed.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
          <h1 className="flex-1 font-bold text-base text-gray-900 dark:text-white">Groups</h1>
          <button onClick={() => setShowJoin(true)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> Join
          </button>
          <button onClick={() => setShowCreate(true)} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-3 py-1.5 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" /></div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">No groups yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
              Create a group for your small group or ministry — an ongoing chat, announcements, and events all in one place.
            </p>
            <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">
              Create a group
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map(g => (
              <button key={g.id} onClick={() => onOpenGroup(g.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {g.avatar_url ? <img src={g.avatar_url} alt="" className="w-full h-full object-cover" /> : (g.name.charAt(0).toUpperCase())}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                    {g.name}
                    {g.my_role === 'leader' && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Leader</span>}
                  </div>
                  {g.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{g.description}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Sheet title="Create a group" onClose={() => setShowCreate(false)}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name (e.g. Tuesday Small Group)" maxLength={60}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-2" autoFocus />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this group about? (optional)" rows={3} maxLength={200}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
          <button onClick={handleCreate} disabled={busy || !name.trim()}
            className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
            {busy ? 'Creating…' : 'Create group'}
          </button>
        </Sheet>
      )}

      {showJoin && (
        <Sheet title="Join a group" onClose={() => setShowJoin(false)}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Paste the invite link a group leader shared with you.</p>
          <input value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="https://www.worshipnyaps.com/group/…?join=…"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" autoFocus />
          <button onClick={handleJoin} disabled={busy || !linkInput.trim()}
            className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
            {busy ? 'Joining…' : 'Join group'}
          </button>
        </Sheet>
      )}
    </div>
  );
};

const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-4 h-4" /></button>
      </div>
      {children}
    </div>
  </div>
);
