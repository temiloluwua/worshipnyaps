import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Plus, X, Check, Lock } from 'lucide-react';
import { usePolls, Poll, PollScope } from '../../hooks/usePolls';

interface PollsSectionProps {
  scope: PollScope;
  // Whether the current user may create a poll (host/co-host for events,
  // members for groups). Voting/closing is enforced server-side.
  canCreate?: boolean;
  title?: string;
}

export const PollsSection: React.FC<PollsSectionProps> = ({ scope, canCreate = false, title = 'Polls' }) => {
  const { fetchPolls, createPoll, toggleVote, closePoll, busy, userId } = usePolls();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const scopeKey = 'eventId' in scope ? scope.eventId : scope.groupId;
  const load = useCallback(async () => { setPolls(await fetchPolls(scope)); }, [fetchPolls, scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const onVote = async (choiceId: string) => {
    const ok = await toggleVote(choiceId);
    if (ok) load();
  };

  const onClose = async (pollId: string) => {
    if (!window.confirm('Close this poll? No more votes will be allowed.')) return;
    if (await closePoll(pollId)) load();
  };

  const submit = async () => {
    const cleaned = options.map(o => o.trim()).filter(Boolean);
    const ok = await createPoll(scope, question, cleaned, allowMultiple);
    if (ok) {
      setShowCreate(false);
      setQuestion(''); setOptions(['', '']); setAllowMultiple(false);
      load();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal-500" /> {title}
        </h3>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> New poll
          </button>
        )}
      </div>

      {polls.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">No polls yet.</p>
      )}

      {polls.map((p) => {
        const total = p.choices.reduce((s, c) => s + c.votes.length, 0);
        const canClose = p.status === 'open' && (p.created_by === userId || canCreate);
        return (
          <div key={p.id} className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-medium text-sm text-gray-900 dark:text-white">{p.question}</p>
              {p.status === 'closed' && (
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-gray-400"><Lock className="w-3 h-3" /> Closed</span>
              )}
            </div>
            <div className="space-y-1.5">
              {p.choices.map((c) => {
                const count = c.votes.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const mine = !!userId && c.votes.some(v => v.user_id === userId);
                return (
                  <button
                    key={c.id}
                    onClick={() => p.status === 'open' && onVote(c.id)}
                    disabled={p.status !== 'open'}
                    className={`relative w-full text-left rounded-lg border px-3 py-2 overflow-hidden transition-colors disabled:cursor-default ${
                      mine ? 'border-teal-400 dark:border-teal-600' : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 ${mine ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-gray-100 dark:bg-gray-700/40'}`}
                      style={{ width: `${pct}%` }}
                      aria-hidden="true"
                    />
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200">
                        {mine && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                        {c.text}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pct}% · {count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-gray-400">
                {total} vote{total === 1 ? '' : 's'}{p.allow_multiple ? ' · pick multiple' : ''}
              </span>
              {canClose && (
                <button onClick={() => onClose(p.id)} className="text-[11px] text-gray-500 hover:text-red-600">Close poll</button>
              )}
            </div>
          </div>
        );
      })}

      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">New poll</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input
                value={question} onChange={e => setQuestion(e.target.value)} maxLength={140}
                placeholder="Ask a question…"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              />
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={o}
                      onChange={e => setOptions(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                      maxLength={80}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                    {options.length > 2 && (
                      <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                {options.length < 8 && (
                  <button onClick={() => setOptions(prev => [...prev, ''])} className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Add option
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} className="w-4 h-4 rounded" />
                Allow multiple answers
              </label>
              <button
                onClick={submit}
                disabled={busy || !question.trim() || options.filter(o => o.trim()).length < 2}
                className="w-full py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                {busy ? 'Posting…' : 'Post poll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
