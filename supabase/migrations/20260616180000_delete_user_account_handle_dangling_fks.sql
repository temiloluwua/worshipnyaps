/*
  # Fix delete_user_account() to handle dangling FKs

  The original `delete_user_account()` (migration 20260522120000) just runs
  `DELETE FROM auth.users WHERE id = auth.uid()` and trusts CASCADE to clean
  the rest. That works for most user-owned data, but seven foreign keys
  reference users(id) without `ON DELETE CASCADE` and would block the delete
  with a FK violation:

    events.worship_leader_id
    events.discussion_leader_id
    events.hospitality_coordinator_id
    events.prayer_leader_id
    food_items.assigned_to
    reports.resolved_by
    event_help_requests.assigned_user_id  (references auth.users)

  Fix: NULL them out inside the RPC before the auth.users delete. Keeps the
  event/report/help-request rows intact — the role just becomes "unassigned"
  — which is the right behavior when the user who held that role leaves.

  All updates use information_schema guards so missing tables/columns on
  older installs don't break the migration.
*/

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Event leadership roles: null out so the event survives the host's deletion.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='events' AND column_name='worship_leader_id') THEN
    EXECUTE 'UPDATE public.events SET worship_leader_id = NULL WHERE worship_leader_id = $1' USING v_uid;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='events' AND column_name='discussion_leader_id') THEN
    EXECUTE 'UPDATE public.events SET discussion_leader_id = NULL WHERE discussion_leader_id = $1' USING v_uid;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='events' AND column_name='hospitality_coordinator_id') THEN
    EXECUTE 'UPDATE public.events SET hospitality_coordinator_id = NULL WHERE hospitality_coordinator_id = $1' USING v_uid;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='events' AND column_name='prayer_leader_id') THEN
    EXECUTE 'UPDATE public.events SET prayer_leader_id = NULL WHERE prayer_leader_id = $1' USING v_uid;
  END IF;

  -- Food item assignments revert to unassigned.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='food_items' AND column_name='assigned_to') THEN
    EXECUTE 'UPDATE public.food_items SET assigned_to = NULL WHERE assigned_to = $1' USING v_uid;
  END IF;

  -- Moderation history: keep the report but drop the resolver attribution.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='reports' AND column_name='resolved_by') THEN
    EXECUTE 'UPDATE public.reports SET resolved_by = NULL WHERE resolved_by = $1' USING v_uid;
  END IF;

  -- Help request assignment becomes unassigned (FK to auth.users so the
  -- DELETE below would otherwise fail).
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='event_help_requests' AND column_name='assigned_user_id') THEN
    EXECUTE 'UPDATE public.event_help_requests SET assigned_user_id = NULL WHERE assigned_user_id = $1' USING v_uid;
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
