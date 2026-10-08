import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { localDateKey } from '../lib/topicOfDay';

export interface DailyTopicRow {
  date: string; // YYYY-MM-DD
  topic_id: string;
  title?: string;
}

// Reads the admin-scheduled Topic-of-the-Day schedule and (for admins) writes
// to it. Writes are gated server-side by RLS (public.is_admin), so a non-admin
// call simply fails — no client-side role check needed for safety.
export function useDailyTopics() {
  const [schedule, setSchedule] = useState<Record<string, DailyTopicRow>>({});
  const [todayTopicId, setTodayTopicId] = useState<string | null>(null);
  // The canonical Topic-of-the-Day id from get_topic_of_the_day() — the single
  // source of truth the feed and landing both use so they always match.
  const [canonicalTotdId, setCanonicalTotdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resolve the canonical pick (admin override or daily rotation) + today's raw
  // override id. The RPC is the authority; todayTopicId is kept for the
  // scheduler UI.
  const fetchToday = useCallback(async () => {
    const [overrideRes, canonicalRes] = await Promise.all([
      supabase.from('daily_topics').select('topic_id').eq('date', localDateKey()).maybeSingle(),
      supabase.rpc('get_topic_of_the_day'),
    ]);
    setTodayTopicId((overrideRes.data as { topic_id: string } | null)?.topic_id ?? null);
    setCanonicalTotdId((canonicalRes.data as { id: string } | null)?.id ?? null);
  }, []);

  // A date range for the admin scheduler, joined to topic titles for display.
  const fetchSchedule = useCallback(async (fromISO: string, toISO: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_topics')
        .select('date, topic_id, topics ( title )')
        .gte('date', fromISO)
        .lte('date', toISO)
        .order('date', { ascending: true });
      if (error) throw error;
      const map: Record<string, DailyTopicRow> = {};
      (data || []).forEach((r: any) => {
        map[r.date] = { date: r.date, topic_id: r.topic_id, title: r.topics?.title };
      });
      setSchedule(map);
    } finally {
      setLoading(false);
    }
  }, []);

  const setDailyTopic = useCallback(async (dateISO: string, topicId: string) => {
    const { error } = await supabase
      .from('daily_topics')
      .upsert(
        { date: dateISO, topic_id: topicId, set_by: (await supabase.auth.getUser()).data.user?.id, updated_at: new Date().toISOString() },
        { onConflict: 'date' }
      );
    if (error) throw error;
    if (dateISO === localDateKey()) setTodayTopicId(topicId);
  }, []);

  const clearDailyTopic = useCallback(async (dateISO: string) => {
    const { error } = await supabase.from('daily_topics').delete().eq('date', dateISO);
    if (error) throw error;
    if (dateISO === localDateKey()) setTodayTopicId(null);
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  return { schedule, todayTopicId, canonicalTotdId, loading, fetchToday, fetchSchedule, setDailyTopic, clearDailyTopic };
}
