/*
  # Fix infinite recursion in event RLS policies

  The previous migration referenced event_attendees from within event_attendees's
  own policy via an EXISTS subquery, which causes Postgres to recursively
  re-evaluate the policy and error out — surfacing as "errors loading events"
  in the client.

  Fix: introduce a SECURITY DEFINER helper that does the attendee check
  bypassing RLS, then rewrite the three affected policies in terms of it.
*/

CREATE OR REPLACE FUNCTION public.is_event_attendee(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_attendees
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND status IN ('registered', 'attended')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_event_attendee(uuid, uuid) TO authenticated;

-- =====================================================
-- event_attendees: no self-reference
-- =====================================================
DROP POLICY IF EXISTS "Attendees, hosts and co-hosts can read attendees" ON public.event_attendees;

CREATE POLICY "Attendees, hosts and co-hosts can read attendees"
  ON public.event_attendees FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_attendees.event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_cohosts c WHERE c.event_id = event_attendees.event_id AND c.user_id = auth.uid())
    OR public.is_event_attendee(event_attendees.event_id, auth.uid())
  );

-- =====================================================
-- event_help_requests
-- =====================================================
DROP POLICY IF EXISTS "Event participants can read help requests" ON public.event_help_requests;

CREATE POLICY "Event participants can read help requests"
  ON public.event_help_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_help_requests.event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_cohosts c WHERE c.event_id = event_help_requests.event_id AND c.user_id = auth.uid())
    OR public.is_event_attendee(event_help_requests.event_id, auth.uid())
  );

-- =====================================================
-- event_cohosts
-- =====================================================
DROP POLICY IF EXISTS "Event participants can view cohosts" ON public.event_cohosts;

CREATE POLICY "Event participants can view cohosts"
  ON public.event_cohosts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_cohosts.event_id AND e.host_id = auth.uid())
    OR public.is_event_attendee(event_cohosts.event_id, auth.uid())
  );

NOTIFY pgrst, 'reload schema';
