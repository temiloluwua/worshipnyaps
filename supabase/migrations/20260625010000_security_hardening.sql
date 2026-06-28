/*
  # Pre-launch RLS hardening

  Findings from the audit:

  1. conversation_participants SELECT was USING(true) — any authenticated
     user could enumerate every DM/group membership in the database.
     Patched with a SECURITY DEFINER helper that breaks the recursion
     without leaking the full table.

  2. conversations INSERT was WITH CHECK(true) — any authenticated user
     could spam orphan conversation rows. Locked down to false; legit
     creation paths use SECURITY DEFINER RPCs (get_or_create_dm_conversation,
     create_group_conversation) and SECURITY DEFINER trigger functions
     (which we promote in fix #3 below) that bypass RLS.

  3. Three event-conversation trigger functions were SECURITY DEFINER-less
     and missing SET search_path. Promoted to SECURITY DEFINER (so they
     keep working after the conversations INSERT lockdown) AND given a
     pinned search path to close the search-path-hijack vector.

  4. activity_feed SELECT regressed to USING(true) — exposed every user's
     entire action history. Re-scoped to the row owner.
*/

-- ---------------------------------------------------------------------------
-- 1. conversation_participants SELECT — replace USING(true) with a
-- non-recursive owner-or-member check via SECURITY DEFINER helper.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF p_conv_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conv_id AND user_id = p_user_id
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Anyone authenticated can view conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

CREATE POLICY "Members can read participants of their conversations"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_conversation_member(conversation_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 2. conversations INSERT — block direct inserts. Legit creation flows
-- through SECURITY DEFINER RPCs and trigger functions that bypass RLS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversation" ON public.conversations;

CREATE POLICY "Block direct conversation insert"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 3. Promote three event-conversation trigger functions to SECURITY DEFINER
-- and pin their search_path. Required so the conversations INSERT lockdown
-- doesn't break event group chat auto-creation.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.create_event_conversation() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.add_attendee_to_event_conversation() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.add_rsvp_to_event_conversation() SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 4. activity_feed SELECT — re-scope to row owner. Earlier migration
-- (20260603140000) regressed this to USING(true).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view all activity" ON public.activity_feed;
DROP POLICY IF EXISTS "Anyone authenticated can view activity_feed" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can view activities involving them" ON public.activity_feed;

CREATE POLICY "Users see their own activity"
  ON public.activity_feed FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

NOTIFY pgrst, 'reload schema';
