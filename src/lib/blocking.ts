import { supabase } from './supabase';

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
