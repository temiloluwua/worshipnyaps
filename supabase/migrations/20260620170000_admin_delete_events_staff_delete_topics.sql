/*
  # Admins can delete any event; staff (admin or moderator) can delete any topic

  Closing the last two RLS gaps for the admin/moderator system that the
  20260612140000 migration set up:

    - events:  host/editor only → also allow admin (mirrors the comments and
               event_announcements pattern from 20260616220000)
    - topics:  author only → also allow staff (admin OR moderator), so
               moderators can clean up spam questions, not just admins

  The "Admins can manage all topics" FOR ALL policy from 20260309 stays in
  place — this just adds moderator-tier delete on top.
*/

-- Events: host, editor, or admin can delete
DROP POLICY IF EXISTS "Host or editor can delete events" ON public.events;
DROP POLICY IF EXISTS "Host editor or admin can delete events" ON public.events;
CREATE POLICY "Host editor or admin can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (
    host_id = (select auth.uid())
    OR public.is_event_cohost_editor(id, (select auth.uid()))
    OR public.is_admin((select auth.uid()))
  );

-- Topics: staff (admin or moderator) can delete any topic, on top of the
-- existing author-can-delete and admin-can-manage-all policies.
DROP POLICY IF EXISTS "Staff can delete topics" ON public.topics;
CREATE POLICY "Staff can delete topics"
  ON public.topics FOR DELETE TO authenticated
  USING (public.is_staff((select auth.uid())));

NOTIFY pgrst, 'reload schema';
