/*
  # User verification via host-marked event attendance

  1. Purpose
    - Add a verified-user signal that hosts award by marking attendees as
      having actually attended their event. Verified users get a checkmark
      next to their name across the app.

  2. Changes
    - users: add `is_verified` boolean (default false).
    - Trigger on event_attendees: when status flips to 'attended', set the
      attendee's users.is_verified = true.
    - RLS: allow the event host to UPDATE event_attendees rows for events
      they host (so they can flip status to 'attended').
    - Backfill: any user with an existing 'attended' row is marked verified.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

UPDATE public.users u
SET is_verified = true
WHERE EXISTS (
  SELECT 1 FROM public.event_attendees a
  WHERE a.user_id = u.id AND a.status = 'attended'
);

CREATE OR REPLACE FUNCTION public.mark_user_verified_on_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'attended'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'attended') THEN
    UPDATE public.users SET is_verified = true WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_attendees_verification ON public.event_attendees;
CREATE TRIGGER event_attendees_verification
AFTER INSERT OR UPDATE OF status ON public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION public.mark_user_verified_on_attendance();

DROP POLICY IF EXISTS "Hosts can update attendees of their events" ON public.event_attendees;
CREATE POLICY "Hosts can update attendees of their events"
  ON public.event_attendees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_attendees.event_id
        AND e.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_attendees.event_id
        AND e.host_id = auth.uid()
    )
  );
