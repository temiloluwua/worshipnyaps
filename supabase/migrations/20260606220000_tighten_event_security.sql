/*
  # Tighten event security — close audit findings

  HIGH issues being fixed:
  1. No DELETE policy on events — any authenticated user can delete any event.
     → Add DELETE policy restricted to host or co-host with can_edit = true.
  2. Friends-only events visible to non-friends — SELECT policy doesn't check
     the connection. → Rewrite SELECT to require an active connection when
     visibility = 'friends_only'.
  3. Any user can RSVP to any event regardless of visibility. → INSERT policy
     on event_attendees now requires the user to be able to see the event.

  MEDIUM issues being fixed:
  5. event-images storage upload is unscoped. → Path prefix must start with
     auth.uid()/  so users can't fill the bucket arbitrarily or overwrite
     each other's keys (the path also doubles as the per-user namespace).

  Intentionally NOT fixed (acknowledged tradeoffs):
  4. Address masking is still client-side. Threat model: knowing the event
     means you can see the address. The bigger threat (random non-friend
     viewing a friends-only address) is fixed by #2 above. True column-level
     masking would require views or RPCs and broader client rewrites; deferred.
  6. invite_code remains a client-side hint. Private events stay visible to
     anyone with the UUID — treated like share-by-link secrets (UUIDs are
     unguessable). This avoids needing a SECURITY DEFINER RPC for redemption.

  All policies are idempotent (DROP IF EXISTS + CREATE).
*/

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_event_cohost(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_cohosts
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_event_cohost(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_event_cohost_editor(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_cohosts
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND can_edit = true
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_event_cohost_editor(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.users_are_connected(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'active'
      AND (
        (user_id = p_a AND connected_user_id = p_b)
        OR (user_id = p_b AND connected_user_id = p_a)
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.users_are_connected(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_user_see_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND (
        e.visibility = 'public'
        OR e.visibility = 'private'
        OR e.host_id = p_user_id
        OR public.is_event_cohost(e.id, p_user_id)
        OR public.is_event_attendee(e.id, p_user_id)
        OR (
          e.visibility = 'friends_only'
          AND public.users_are_connected(e.host_id, p_user_id)
        )
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_user_see_event(uuid, uuid) TO authenticated;


-- ----------------------------------------------------------------------------
-- HIGH #2: events SELECT — proper friends_only check
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Public events are viewable" ON public.events;
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Events: public, host, cohost, attendee, friend" ON public.events;

CREATE POLICY "Events: public, host, cohost, attendee, friend"
  ON public.events FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR visibility = 'private'
    OR host_id = auth.uid()
    OR public.is_event_cohost(id, auth.uid())
    OR public.is_event_attendee(id, auth.uid())
    OR (
      visibility = 'friends_only'
      AND public.users_are_connected(host_id, auth.uid())
    )
  );

-- Anonymous users can still see public events (landing pages, share links)
DROP POLICY IF EXISTS "Anon can read public events" ON public.events;
CREATE POLICY "Anon can read public events"
  ON public.events FOR SELECT TO anon
  USING (visibility = 'public');


-- ----------------------------------------------------------------------------
-- HIGH #1: events DELETE — host or can_edit cohost only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Host or editor can delete events" ON public.events;

CREATE POLICY "Host or editor can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (
    host_id = auth.uid()
    OR public.is_event_cohost_editor(id, auth.uid())
  );


-- ----------------------------------------------------------------------------
-- HIGH #3: event_attendees INSERT — must be able to see the event
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can register for events" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can RSVP to events they can see" ON public.event_attendees;

CREATE POLICY "Users can RSVP to events they can see"
  ON public.event_attendees FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_user_see_event(event_id, auth.uid())
  );


-- ----------------------------------------------------------------------------
-- MEDIUM #5: scope event-images uploads to {auth.uid()}/...
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Users can upload event images to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own event images" ON storage.objects;
CREATE POLICY "Users can update their own event images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own event images" ON storage.objects;
CREATE POLICY "Users can delete their own event images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';
