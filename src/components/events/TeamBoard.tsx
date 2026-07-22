import React, { useCallback, useEffect, useState } from 'react';
import { X, Music, BookOpen, Heart, Coffee, Wrench, MoreHorizontal, HeartHandshake, UtensilsCrossed, Check, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// Co-host roles offered on the board. Kept in sync with CoHostManager's ROLES
// (labels/descriptions only — no icons needed for the picker here).
const COHOST_ROLES: { key: string; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'worship',     label: 'Worship',          description: 'open with a few songs (~15 min)', icon: Music },
  { key: 'discussion',  label: 'Bible Discussion', description: 'lead the Bible study / discussion', icon: BookOpen },
  { key: 'prayer',      label: 'Prayer',           description: 'lead opening or closing prayer', icon: Heart },
  { key: 'hospitality', label: 'Hospitality',      description: 'welcome people and handle food / drinks', icon: Coffee },
  { key: 'tech',        label: 'Tech / Setup',     description: 'handle sound, lights, and room setup', icon: Wrench },
  { key: 'other',       label: 'Other',            description: 'help lead a part of the gathering', icon: MoreHorizontal },
];

interface BoardData {
  event: { id: string; title: string; date: string; time: string; host_id: string } | null;
  taken_cohost_roles: string[];
  help: { id: string; title: string; description: string | null }[];
  food: { id: string; item: string; category: string | null }[];
}

interface TeamBoardProps {
  eventId: string;
  teamCode: string;
  // Optional targeted pick from the link: "cohost:worship" | "help:{id}" | "food:{id}".
  pick?: string | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onClaimed?: () => void;
}

export const TeamBoard: React.FC<TeamBoardProps> = ({ eventId, teamCode, pick, onClose, onRequireAuth, onClaimed }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [cohostPending, setCohostPending] = useState(false);

  const [pickKind, pickValue] = (pick || '').split(':');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_team_board', { p_event_id: eventId, p_team_code: teamCode });
      if (error) throw error;
      setBoard(data as BoardData);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load the team board');
    } finally {
      setLoading(false);
    }
  }, [user, eventId, teamCode]);

  useEffect(() => { load(); }, [load]);

  const claim = async (
    key: string,
    args: { kind: 'cohost' | 'help' | 'food'; targetId?: string; role?: string },
  ) => {
    if (!user) { onRequireAuth(); return; }
    setClaiming(key);
    try {
      const { data, error } = await supabase.rpc('claim_team_role', {
        p_event_id: eventId,
        p_team_code: teamCode,
        p_kind: args.kind,
        p_target_id: args.targetId ?? null,
        p_role: args.role ?? null,
        p_custom_label: null,
      });
      if (error) throw error;
      if (data === 'cohost_pending') {
        setCohostPending(true);
        toast.success('Sent to the host for approval 🙌');
      } else if (data === 'already_cohost') {
        toast('You are already a co-host for this event');
      } else {
        toast.success("You're on the team — thank you! 🙌");
      }
      await load();
      onClaimed?.();
    } catch (err: any) {
      toast.error(err?.message || 'Could not claim that role');
    } finally {
      setClaiming(null);
    }
  };

  const availableCohostRoles = COHOST_ROLES.filter(
    r => r.key === 'other' || !(board?.taken_cohost_roles || []).includes(r.key)
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-gray-900 dark:text-white">Help run this event</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {board?.event && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Pick anything you can help with for <span className="font-semibold text-gray-900 dark:text-white">{board.event.title}</span>. The host builds their team from volunteers like you.
            </p>
          )}

          {!user ? (
            <div className="text-center py-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Sign up (free) to join the team and pick a role.
              </p>
              <button
                onClick={onRequireAuth}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign up to help
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {/* Co-host / leadership roles */}
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Lead a part</h4>
                {cohostPending ? (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-300">
                    Your request to co-host was sent to the host for approval.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableCohostRoles.map((r) => {
                      const Icon = r.icon;
                      const highlighted = pickKind === 'cohost' && pickValue === r.key;
                      return (
                        <div
                          key={r.key}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            highlighted
                              ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{r.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.description}</div>
                          </div>
                          <button
                            onClick={() => claim(`cohost:${r.key}`, { kind: 'cohost', role: r.key })}
                            disabled={claiming !== null}
                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex-shrink-0"
                          >
                            {claiming === `cohost:${r.key}` ? '…' : "I'll lead"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Helper roles */}
              {board && board.help.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Volunteer roles</h4>
                  <div className="space-y-2">
                    {board.help.map((h) => {
                      const highlighted = pickKind === 'help' && pickValue === h.id;
                      return (
                        <div key={h.id} className={`flex items-center gap-3 p-3 rounded-lg border ${highlighted ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{h.title}</div>
                            {h.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{h.description}</div>}
                          </div>
                          <button
                            onClick={() => claim(`help:${h.id}`, { kind: 'help', targetId: h.id })}
                            disabled={claiming !== null}
                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                          >
                            {claiming === `help:${h.id}` ? '…' : "I'll do this"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Bring-items */}
              {board && board.food.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Bring something</h4>
                  <div className="space-y-2">
                    {board.food.map((f) => {
                      const highlighted = pickKind === 'food' && pickValue === f.id;
                      return (
                        <div key={f.id} className={`flex items-center gap-3 p-3 rounded-lg border ${highlighted ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                          <UtensilsCrossed className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{f.item}</div>
                            {f.category && <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{f.category}</div>}
                          </div>
                          <button
                            onClick={() => claim(`food:${f.id}`, { kind: 'food', targetId: f.id })}
                            disabled={claiming !== null}
                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex-shrink-0"
                          >
                            {claiming === `food:${f.id}` ? '…' : "I'll bring it"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {board && availableCohostRoles.length === 0 && board.help.length === 0 && board.food.length === 0 && !cohostPending && (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
                  <Check className="w-8 h-8 text-green-500" />
                  This team is all set — every role is filled. Thanks for checking!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
