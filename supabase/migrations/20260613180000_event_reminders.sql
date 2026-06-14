/*
  # Event reminders via pg_cron

  Drops a row in the notifications table for every attendee + host of an
  event that's coming up. Two reminder reminder_windows:

  - 24 hours before: "X is tomorrow"
  - 1 hour before: "X starts in 1 hour"

  Implementation:
  - Enable pg_cron (Supabase has it available; idempotent CREATE EXTENSION)
  - send_event_reminders() SECURITY DEFINER function that scans events
    starting within ~1h and ~24h reminder_windows and inserts notifications. Uses
    a notified_reminders set tracked in payload to avoid duplicates.
  - Schedule it to run every 10 minutes.

  Why 10 min cadence: balances notification latency (max delay ~10 min
  off the 1h mark) vs DB load. Easy to tighten to 5 min if needed.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Track which reminders have already fired so we don't double-send
CREATE TABLE IF NOT EXISTS public.event_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reminder_window text NOT NULL CHECK (reminder_window IN ('24h', '1h')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, reminder_window)
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_sent_lookup
  ON public.event_reminders_sent(event_id, reminder_window);

ALTER TABLE public.event_reminders_sent ENABLE ROW LEVEL SECURITY;
-- No client access; only the cron job (running as the function owner) writes here
DROP POLICY IF EXISTS "Reminders sent table is server-only" ON public.event_reminders_sent;
CREATE POLICY "Reminders sent table is server-only"
  ON public.event_reminders_sent FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.send_event_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_now timestamptz := now();
  v_event RECORD;
  v_recipient uuid;
  v_reminder_window text;
  v_title text;
  v_body text;
BEGIN
  -- Iterate over events whose start time falls in either reminder reminder_window.
  -- "start time" is date + time concatenated and cast to timestamptz.
  FOR v_event IN
    SELECT
      e.id,
      e.title,
      e.host_id,
      (e.date::text || ' ' || COALESCE(e.time::text, '00:00:00'))::timestamptz AS start_at
    FROM public.events e
    WHERE e.status = 'upcoming'
      AND (e.date::text || ' ' || COALESCE(e.time::text, '00:00:00'))::timestamptz
            BETWEEN v_now AND v_now + interval '25 hours'
  LOOP
    -- Decide which reminder_window applies (if any). Allow a 15-minute grace so
    -- a 10-min cron cadence never misses a notification.
    IF v_event.start_at - v_now <= interval '1 hour 15 minutes'
       AND v_event.start_at - v_now > interval '0 minutes' THEN
      v_reminder_window := '1h';
      v_title := v_event.title || ' starts soon';
      v_body := 'See you in about an hour.';
    ELSIF v_event.start_at - v_now <= interval '24 hours 15 minutes'
          AND v_event.start_at - v_now > interval '23 hours 30 minutes' THEN
      v_reminder_window := '24h';
      v_title := v_event.title || ' is tomorrow';
      v_body := 'Quick heads-up — see you tomorrow.';
    ELSE
      CONTINUE;
    END IF;

    -- Notify the host + all registered attendees, skipping already-sent
    FOR v_recipient IN
      SELECT DISTINCT uid FROM (
        SELECT v_event.host_id AS uid
        UNION
        SELECT user_id FROM public.event_attendees
        WHERE event_id = v_event.id AND status IN ('registered', 'attended')
      ) all_recipients
      WHERE uid IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.event_reminders_sent r
          WHERE r.event_id = v_event.id AND r.user_id = uid AND r.reminder_window = v_reminder_window
        )
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, payload)
      VALUES (
        v_recipient,
        'event_reminder',
        v_title,
        v_body,
        jsonb_build_object('event_id', v_event.id, 'reminder_window', v_reminder_window)
      );
      INSERT INTO public.event_reminders_sent (event_id, user_id, reminder_window)
      VALUES (v_event.id, v_recipient, v_reminder_window);
      v_inserted := v_inserted + 1;
    END LOOP;
  END LOOP;

  RETURN v_inserted;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_event_reminders() TO authenticated;

-- Schedule: every 10 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('event-reminders');
EXCEPTION WHEN OTHERS THEN
  -- no existing job, ignore
  NULL;
END $$;

SELECT cron.schedule(
  'event-reminders',
  '*/10 * * * *',
  $$ SELECT public.send_event_reminders(); $$
);

NOTIFY pgrst, 'reload schema';
