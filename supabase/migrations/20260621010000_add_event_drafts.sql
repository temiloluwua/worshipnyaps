/*
  # Add server-side event drafts

  ## Why
  HostEventModal already persists in-progress form state to localStorage so
  X-ing out doesn't lose work on the same device. That doesn't help if the
  host wants to start on phone and continue on laptop, or keep multiple
  half-finished events around. This migration adds a real "draft" state to
  events: the row exists in the DB but is hidden from every viewer except
  the host until they publish it.

  ## What
  - Adds events.is_draft boolean NOT NULL DEFAULT false.
  - Replaces the events SELECT policies so drafts are visible only to their
    host. Co-hosts/attendees can't see a draft (it shouldn't have those
    yet — drafts are pre-publish).
  - Anon viewers never see drafts.
  - Partial index keeps "My Drafts" lookups fast.
*/

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_host_draft
  ON public.events(host_id)
  WHERE is_draft = true;

DROP POLICY IF EXISTS "Events: public, host, cohost, attendee, friend" ON public.events;
CREATE POLICY "Events: public, host, cohost, attendee, friend"
  ON public.events FOR SELECT TO authenticated
  USING (
    host_id = (select auth.uid())
    OR (
      COALESCE(is_draft, false) = false
      AND (
        visibility = 'public'
        OR visibility = 'private'
        OR public.is_event_cohost(id, (select auth.uid()))
        OR public.is_event_attendee(id, (select auth.uid()))
        OR (
          visibility = 'friends_only'
          AND public.users_are_connected(host_id, (select auth.uid()))
        )
      )
    )
  );

DROP POLICY IF EXISTS "Anon can read public events" ON public.events;
CREATE POLICY "Anon can read public events"
  ON public.events FOR SELECT TO anon
  USING (
    visibility = 'public'
    AND COALESCE(is_draft, false) = false
  );
