import React, { useEffect, useState } from 'react';
import { Sparkles, Check, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { giftsForHelpType } from '../../lib/giftMatching';

interface SuggestedHelpersProps {
  eventId: string;
  eventTitle: string;
  helpType: string;   // event_help_requests.request_type
  roleLabel: string;  // human label, e.g. "Prayer"
}

interface Candidate {
  id: string;
  name: string;
  avatar_url?: string;
  spiritual_gifts?: string[];
}

// Host-facing: for an open help request, suggest community members whose
// spiritual gifts fit the need, and let the host invite them with one tap
// (a volunteer-opportunity notification). Shown only to the host.
export const SuggestedHelpers: React.FC<SuggestedHelpersProps> = ({ eventId, eventTitle, helpType, roleLabel }) => {
  const { user } = useAuth();
  const { sendVolunteerOpportunityNotification } = useNotifications();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const gifts = giftsForHelpType(helpType);
    if (gifts.length === 0) { setCandidates([]); return; }

    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, spiritual_gifts')
        .overlaps('spiritual_gifts', gifts)
        .limit(12);
      if (cancelled) return;
      if (error) {
        console.error('Error loading suggested helpers:', error);
        return;
      }
      const filtered = (data || []).filter((u: Candidate) => u.id !== user?.id).slice(0, 6);
      setCandidates(filtered);
    })();

    return () => { cancelled = true; };
  }, [helpType, user?.id]);

  const invite = async (candidate: Candidate) => {
    setSending(candidate.id);
    const ok = await sendVolunteerOpportunityNotification(eventTitle, roleLabel, eventId, [candidate.id]);
    setSending(null);
    if (ok) {
      // sendVolunteerOpportunityNotification shows its own success toast.
      setInvited((prev) => new Set(prev).add(candidate.id));
    } else {
      toast.error('Could not send invite');
    }
  };

  if (candidates.length === 0) return null;

  return (
    <div className="px-4 pb-4 pt-1">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
          Gifted in {roleLabel}
        </span>
      </div>
      <div className="space-y-1.5">
        {candidates.map((c) => {
          const isInvited = invited.has(c.id);
          return (
            <div key={c.id} className="flex items-center gap-2">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt={c.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-200 flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-900 dark:text-white truncate flex-1">{c.name}</span>
              <button
                onClick={() => invite(c)}
                disabled={isInvited || sending === c.id}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                  isInvited
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default'
                    : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60'
                }`}
              >
                {isInvited ? (
                  <><Check className="w-3 h-3" /> Invited</>
                ) : (
                  <><Send className="w-3 h-3" /> {sending === c.id ? '…' : 'Invite'}</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
