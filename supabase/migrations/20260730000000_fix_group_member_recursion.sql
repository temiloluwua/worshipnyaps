/*
  # Fix RLS infinite recursion via group-member helpers

  is_group_member/is_group_leader were LANGUAGE sql. A SQL helper can be
  inlined into the calling RLS policy, which loses the SECURITY DEFINER
  context — so the function's own SELECT on group_members re-applies RLS,
  which calls the helper again → "infinite recursion detected in policy".
  This surfaced when editing an event (the events group-member SELECT policy
  calls is_group_member).

  Fix: reimplement both as LANGUAGE plpgsql (never inlined), matching the
  proven is_event_cohost pattern. Same signatures, so dependent policies keep
  working without being dropped.
*/

CREATE OR REPLACE FUNCTION public.is_group_member(p_group uuid, p_user uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group AND user_id = p_user) INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_leader(p_group uuid, p_user uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group AND user_id = p_user AND role = 'leader') INTO v;
  RETURN v;
END;
$$;

NOTIFY pgrst, 'reload schema';
