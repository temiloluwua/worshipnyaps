import { supabase } from './supabase';

// Turn a list of free-text "help request" titles (captured on the event
// create/edit form) into real rows in event_help_requests, so they show up and
// are claimable in the event's Help tab — the single source of truth. Each is
// left open to volunteers. Best-effort: never throws (the event itself is
// already saved by the caller).
export async function createHelpRequestsFromTitles(eventId: string, titles: string[]): Promise<void> {
  const clean = Array.from(
    new Set((titles || []).map((t) => (t || '').trim()).filter(Boolean))
  );
  if (!eventId || clean.length === 0) return;
  try {
    await supabase.from('event_help_requests').insert(
      clean.map((title) => ({
        event_id: eventId,
        request_type: 'other' as const,
        title,
        status: 'open' as const,
        open_to_volunteers: true,
      }))
    );
  } catch {
    /* best-effort — the event is already created */
  }
}
