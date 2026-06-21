/*
  # Fix "Send help request to a person" end-to-end flow

  ## Why
  Two RLS gaps made the host's "Send request to…" action on the event detail
  page silently fail end-to-end:

  1. The notifications INSERT policy set by
     20260309_core_rls_subselect_fix only allowed user_id = auth.uid(), so a
     host could not insert a notification addressed to the assignee. The
     client (EventHelpRequests.handleAssign) does not check this error, so
     the host sees "Request sent!" while the recipient never hears about it.

  2. The "Authenticated users can volunteer for help requests" UPDATE policy
     on event_help_requests requires assigned_user_id IS NULL in USING. Once
     the host has set assigned_user_id to the recipient, this policy blocks
     that recipient from flipping status to 'filled' (Accept) or clearing
     assigned_user_id (Decline).

  ## What
  - Replace the notifications INSERT policy with one that also permits an
    event host to create notifications scoped to their event (matches the
    pre-2026-03-09 behavior, kept narrow via the event_id check).
  - Replace the volunteer UPDATE policy so the user named in
    assigned_user_id can update their own row to accept or decline.
*/

DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR (
      event_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = notifications.event_id
          AND e.host_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can volunteer for help requests" ON public.event_help_requests;
CREATE POLICY "Assignee or open-volunteer can update help requests"
  ON public.event_help_requests FOR UPDATE
  TO authenticated
  USING (
    (status = 'open' AND assigned_user_id IS NULL)
    OR assigned_user_id = (select auth.uid())
  )
  WITH CHECK (
    assigned_user_id = (select auth.uid())
    OR (assigned_user_id IS NULL AND status = 'open')
  );
