import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

type TargetType = 'topic' | 'event';

// Manages whether the current user gets notifications for a specific topic or
// event. Defaults mirror the DB triggers:
//   - topic: ON only if you're the author, otherwise OFF
//   - event: ON (you're expected to want updates for events you're part of)
// An explicit row in notification_subscriptions overrides the default.
export function useNotificationSubscription(
  targetType: TargetType,
  targetId: string | undefined,
  opts: { isAuthor?: boolean } = {}
) {
  const { user } = useAuth();
  const defaultOn = targetType === 'event' ? true : Boolean(opts.isAuthor);
  const [subscribed, setSubscribed] = useState<boolean>(defaultOn);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubscribed(defaultOn);
    if (!user || !targetId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('notification_subscriptions')
          .select('subscribed')
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .maybeSingle();
        if (!cancelled && data) setSubscribed(data.subscribed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, targetType, targetId, defaultOn]);

  const toggle = useCallback(async () => {
    if (!user || !targetId) return;
    const next = !subscribed;
    setSubscribed(next); // optimistic
    setSaving(true);
    try {
      // Upsert an explicit override. We always store the row (even when it
      // matches the default) so intent is unambiguous across default changes.
      const { error } = await supabase
        .from('notification_subscriptions')
        .upsert(
          {
            user_id: user.id,
            target_type: targetType,
            target_id: targetId,
            subscribed: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,target_type,target_id' }
        );
      if (error) throw error;
      toast.success(next ? 'Notifications on' : 'Notifications off');
    } catch (err: any) {
      setSubscribed(!next); // revert
      toast.error(err?.message || 'Could not update notifications');
    } finally {
      setSaving(false);
    }
  }, [user, targetId, targetType, subscribed]);

  return { subscribed, toggle, loading, saving };
}
