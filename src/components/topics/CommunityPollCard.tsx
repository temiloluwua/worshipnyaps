import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, CircleDot } from 'lucide-react';
import { useCommunityPolls, CommunityPoll } from '../../hooks/useCommunityPolls';

interface CommunityPollCardProps {
  postId: string;
  authorId: string;
  onOpenEvent?: (eventId: string) => void;
  // Prompt sign-in when a logged-out reader tries to vote.
  onRequireAuth?: () => void;
}

const formatDay = (date: string, time: string) => {
  // date is 'YYYY-MM-DD', time is 'HH:MM[:SS]'. Parse as local, not UTC.
  const d = new Date(`${date}T${(time || '00:00').slice(0, 5)}`);
  if (isNaN(d.getTime())) return `${date} ${time}`;
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const clock = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${clock}`;
};

// Inline "which day works?" poll shown on a community post. People tap the days
// they can make; the author turns a winning day into an event, which registers
// everyone who voted for it.
export const CommunityPollCard: React.FC<CommunityPollCardProps> = ({
  postId,
  authorId,
  onOpenEvent,
  onRequireAuth,
}) => {
  const { fetchPoll, toggleVote, finalizePoll, userId } = useCommunityPolls();
  const [poll, setPoll] = useState<CommunityPoll | null>(null);
  const [busyOptionId, setBusyOptionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPoll(await fetchPoll(postId));
  }, [fetchPoll, postId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!poll) return null;

  const isAuthor = Boolean(userId) && userId === authorId;
  const isOpen = poll.status === 'open';
  const totalVoters = new Set(
    poll.options.flatMap((o) => o.votes.map((v) => v.user_id))
  ).size;
  const topVotes = Math.max(1, ...poll.options.map((o) => o.votes.length));

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleVote = async (optionId: string) => {
    if (!userId) {
      onRequireAuth?.();
      return;
    }
    setBusyOptionId(optionId);
    const ok = await toggleVote(optionId);
    if (ok) await load();
    setBusyOptionId(null);
  };

  const handleFinalize = async (optionId: string) => {
    setBusyOptionId(optionId);
    const eventId = await finalizePoll(optionId);
    setBusyOptionId(null);
    if (eventId) {
      await load();
      onOpenEvent?.(eventId);
    }
  };

  return (
    <div
      onClick={stop}
      className="mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3"
    >
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        <CalendarClock className="w-3.5 h-3.5" />
        {isOpen ? 'Vote for a day' : 'Poll closed'}
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const count = opt.votes.length;
          const mine = Boolean(userId) && opt.votes.some((v) => v.user_id === userId);
          const pct = Math.round((count / topVotes) * 100);
          return (
            <div key={opt.id} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isOpen || busyOptionId === opt.id}
                onClick={() => handleVote(opt.id)}
                className={`relative flex-1 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-60 ${
                  mine
                    ? 'border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200'
                    : 'border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-blue-100 dark:bg-blue-900/30"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    {mine ? <Check className="w-4 h-4" /> : <CircleDot className="w-4 h-4 opacity-40" />}
                    {formatDay(opt.proposed_date, opt.proposed_time)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{count}</span>
                </span>
              </button>

              {isAuthor && isOpen && (
                <button
                  type="button"
                  disabled={busyOptionId === opt.id}
                  onClick={() => handleFinalize(opt.id)}
                  className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  title="Create the event on this day with everyone who voted for it"
                >
                  Pick
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{totalVoters} {totalVoters === 1 ? 'person' : 'people'} voted</span>
        {!isOpen && poll.created_event_id && (
          <button
            type="button"
            onClick={() => onOpenEvent?.(poll.created_event_id!)}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            View the event →
          </button>
        )}
        {isAuthor && isOpen && (
          <span className="italic">Tap “Pick” on the winning day</span>
        )}
      </div>
    </div>
  );
};
