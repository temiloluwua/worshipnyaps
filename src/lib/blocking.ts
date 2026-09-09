import { supabase } from './supabase';

export interface BlockContext {
  reason?: string;
  snapshot?: Record<string, unknown>;
  // Skip the auto-filed moderator report. Used when the caller has already filed
  // its own (more detailed) report — e.g. the report-and-block flow — so we
  // don't create a duplicate.
  skipReport?: boolean;
}

/**
 * Block a user — the single source of truth for the block action, shared by the
 * useConnections hook and the in-content ReportButton so behaviour is identical
 * everywhere. Satisfies App Store guideline 1.2: it (a) removes any existing
 * connection, (b) records the block, (c) notifies moderators by auto-filing a
 * report, and (d) broadcasts `wny:user-blocked` so mounted feeds drop the
 * author's content instantly. Returns true on success.
 */
export async function blockUser(
  currentUserId: string,
  blockedUserId: string,
  context?: BlockContext
): Promise<boolean> {
  if (!currentUserId || !blockedUserId || currentUserId === blockedUserId) return false;

  // Remove any existing connection in either direction.
  await supabase
    .from('connections')
    .delete()
    .or(`and(user_id.eq.${currentUserId},connected_user_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},connected_user_id.eq.${currentUserId})`);

  // Record the block.
  const { error } = await supabase
    .from('blocked_users')
    .insert({
      user_id: currentUserId,
      blocked_user_id: blockedUserId,
      reason: context?.reason || 'Blocked by user',
    });
  // A duplicate (already blocked) is fine — treat as success.
  if (error && !/duplicate|unique/i.test(error.message)) {
    throw error;
  }

  // App Store 1.2: blocking must ALSO notify the developer of the inappropriate
  // content. File a report to the moderation queue. Best-effort — a report
  // failure must never stop the block from taking effect. Skipped when the
  // caller already filed its own report (report-and-block flow).
  if (!context?.skipReport) try {
    await supabase.from('reports').insert({
      reporter_id: currentUserId,
      reported_user_id: blockedUserId,
      report_type: 'user',
      category: 'harassment',
      severity: 'high',
      description: context?.reason
        ? `User blocked by a member. ${context.reason}`
        : 'User blocked by a member — auto-filed for moderator review.',
      ...(context?.snapshot ? { content_snapshot: context.snapshot } : {}),
    });
  } catch (reportErr) {
    console.error('Auto-report on block failed (block still applied):', reportErr);
  }

  // Broadcast so any mounted feed drops this author's content immediately.
  try { window.dispatchEvent(new CustomEvent('wny:user-blocked', { detail: { userId: blockedUserId } })); } catch { /* noop */ }

  return true;
}

/**
 * Returns the set of user IDs the given user has blocked. Used to filter
 * blocked authors out of feeds/lists client-side (server-side messaging is
 * enforced separately by the block-enforcement migration). Never throws —
 * returns an empty set on error so a lookup failure can't blank the feed.
 */
export async function fetchBlockedIds(userId?: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_user_id')
      .eq('user_id', userId);
    if (error) throw error;
    return new Set((data || []).map((b: { blocked_user_id: string }) => b.blocked_user_id));
  } catch (err) {
    console.error('Error fetching blocked user ids:', err);
    return new Set();
  }
}
