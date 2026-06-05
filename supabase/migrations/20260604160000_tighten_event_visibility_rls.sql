/*
  # Tighten RLS on event-related tables — fix attendee/cohost leak

  Bugs being fixed:
  - event_attendees was readable by ANY authenticated user when the event was
    public, leaking attendee identities to non-participants.
  - event_help_requests was readable by any authenticated user when the event
    was public — same leak.
  - event_cohosts had `USING (true)` — fully public.

  New policy:
  - Read access to event_attendees, event_help_requests, and event_cohosts
    is restricted to: the event host, a co-host of the event, or someone
    who has actually RSVP'd ('registered' or 'attended') to that event.
*/

-- =====================================================
-- event_attendees: restrict SELECT
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read public event attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Attendees, hosts and co-hosts can read attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can read attendees of their events" ON public.event_attendees;
DROP POLICY IF EXISTS "Authenticated users can view registrations" ON public.event_attendees;

CREATE POLICY "Attendees, hosts and co-hosts can read attendees"
  ON public.event_attendees FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_attendees.event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_cohosts c WHERE c.event_id = event_attendees.event_id AND c.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_attendees a
      WHERE a.event_id = event_attendees.event_id
        AND a.user_id = auth.uid()
        AND a.status IN ('registered', 'attended')
    )
  );

-- =====================================================
-- event_help_requests: restrict SELECT
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read help requests for public events" ON public.event_help_requests;
DROP POLICY IF EXISTS "Event participants can read help requests" ON public.event_help_requests;

CREATE POLICY "Event participants can read help requests"
  ON public.event_help_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_help_requests.event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_cohosts c WHERE c.event_id = event_help_requests.event_id AND c.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_attendees a
      WHERE a.event_id = event_help_requests.event_id
        AND a.user_id = auth.uid()
        AND a.status IN ('registered', 'attended')
    )
  );

-- =====================================================
-- event_cohosts: restrict SELECT
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view event cohosts" ON public.event_cohosts;
DROP POLICY IF EXISTS "Event participants can view cohosts" ON public.event_cohosts;

CREATE POLICY "Event participants can view cohosts"
  ON public.event_cohosts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_cohosts.event_id AND e.host_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_attendees a
      WHERE a.event_id = event_cohosts.event_id
        AND a.user_id = auth.uid()
        AND a.status IN ('registered', 'attended')
    )
  );

NOTIFY pgrst, 'reload schema';
