/*
  # Admins / moderators can delete any content

  Existing state:
    - topics:           admins can delete (separate FOR ALL admin policy)
    - community_posts:  is_staff() included (admin or moderator)
    - comments:         only the author can delete  ← gap
    - event_announcements: only host/cohost can delete ← gap

  Aligning the gaps so a moderator/admin can clean up comments and
  announcements via the same is_staff() helper used for community_posts.
  Authors keep their existing rights.
*/

-- Comments: author OR staff
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Authors or staff can delete comments" ON public.comments;
CREATE POLICY "Authors or staff can delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (
    author_id = (select auth.uid())
    OR public.is_staff((select auth.uid()))
  );

-- Event announcements: host/cohost OR staff
DROP POLICY IF EXISTS "Host and cohosts can delete announcements" ON public.event_announcements;
DROP POLICY IF EXISTS "Host cohost or staff can delete announcements" ON public.event_announcements;
CREATE POLICY "Host cohost or staff can delete announcements"
  ON public.event_announcements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.host_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.event_cohosts ec
      WHERE ec.event_id = event_announcements.event_id
        AND ec.user_id = (select auth.uid())
    )
    OR public.is_staff((select auth.uid()))
  );

NOTIFY pgrst, 'reload schema';
