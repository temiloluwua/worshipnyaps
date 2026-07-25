/*
  # Groups / Circles — persistent small-group spaces (MVP)

  A Group is a named, member-based container with:
    - a linked conversations row (is_group=true) as its persistent chat —
      joining a group adds the user as a conversation_participant, so chat
      read/write/realtime reuse the existing DM machinery.
    - members with a role (leader | member)
    - leader-posted announcements
    - a shareable join_code (mirrors event team_code)

  Invite-only: joining requires the group's join_code. Group creation and
  joining go through SECURITY DEFINER RPCs (no broad INSERT policies).
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tables ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  city text,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  join_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

CREATE TABLE IF NOT EXISTS public.group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_announcements_group ON public.group_announcements(group_id, created_at DESC);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;

-- 2. Membership helpers ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(p_group uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group AND user_id = p_user);
$$;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_group_leader(p_group uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group AND user_id = p_user AND role = 'leader');
$$;
GRANT EXECUTE ON FUNCTION public.is_group_leader(uuid, uuid) TO authenticated;

-- 3. RLS ---------------------------------------------------------------------
DROP POLICY IF EXISTS "groups_select_members" ON public.groups;
CREATE POLICY "groups_select_members" ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "groups_update_leader" ON public.groups;
CREATE POLICY "groups_update_leader" ON public.groups FOR UPDATE TO authenticated
  USING (public.is_group_leader(id, auth.uid())) WITH CHECK (public.is_group_leader(id, auth.uid()));

DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_leader(group_id, auth.uid()));

DROP POLICY IF EXISTS "group_announcements_select" ON public.group_announcements;
CREATE POLICY "group_announcements_select" ON public.group_announcements FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "group_announcements_delete" ON public.group_announcements;
CREATE POLICY "group_announcements_delete" ON public.group_announcements FOR DELETE TO authenticated
  USING (public.is_group_leader(group_id, auth.uid()));

-- 4. RPCs --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_conv uuid; v_group uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(COALESCE(p_name, ''))) = 0 THEN RAISE EXCEPTION 'Group name is required'; END IF;

  INSERT INTO public.conversations (is_group, name) VALUES (true, p_name) RETURNING id INTO v_conv;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (v_conv, v_uid);

  INSERT INTO public.groups (name, description, created_by, conversation_id)
  VALUES (p_name, p_description, v_uid, v_conv) RETURNING id INTO v_group;

  INSERT INTO public.group_members (group_id, user_id, role) VALUES (v_group, v_uid, 'leader');
  RETURN v_group;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_group(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid, p_join_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_conv uuid; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT conversation_id, name INTO v_conv, v_name FROM public.groups WHERE id = p_group_id AND join_code = p_join_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid group link'; END IF;

  INSERT INTO public.group_members (group_id, user_id) VALUES (p_group_id, v_uid) ON CONFLICT DO NOTHING;
  IF v_conv IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv, v_uid) ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  -- Notify leaders that someone joined.
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT gm.user_id, 'general', 'New group member',
         COALESCE((SELECT name FROM public.users WHERE id = v_uid), 'Someone') || ' joined ' || COALESCE(v_name, 'your group'),
         jsonb_build_object('group_id', p_group_id)
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.role = 'leader' AND gm.user_id <> v_uid;

  RETURN p_group_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_group(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.post_group_announcement(p_group_id uuid, p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_gname text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_group_leader(p_group_id, v_uid) THEN
    RAISE EXCEPTION 'Only group leaders can post announcements';
  END IF;
  IF length(trim(COALESCE(p_content, ''))) = 0 THEN RAISE EXCEPTION 'Announcement is empty'; END IF;

  INSERT INTO public.group_announcements (group_id, author_id, content)
  VALUES (p_group_id, v_uid, p_content) RETURNING id INTO v_id;

  SELECT name INTO v_gname FROM public.groups WHERE id = p_group_id;
  INSERT INTO public.notifications (user_id, type, title, body, payload)
  SELECT gm.user_id, 'general', 'Announcement in ' || COALESCE(v_gname, 'your group'),
         left(p_content, 120), jsonb_build_object('group_id', p_group_id)
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id <> v_uid;

  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.post_group_announcement(uuid, text) TO authenticated;

-- 5. Group chats are not 1:1 DMs — the block guard must not fire on them,
--    otherwise one member blocking another would break the whole group chat.
CREATE OR REPLACE FUNCTION public.enforce_dm_block()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_blocked boolean; v_is_group boolean;
BEGIN
  SELECT COALESCE(is_group, false) INTO v_is_group FROM public.conversations WHERE id = NEW.conversation_id;
  IF COALESCE(v_is_group, false) THEN
    RETURN NEW; -- block rules only apply to 1:1 conversations
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id <> NEW.sender_id
      AND public.is_blocked_between(NEW.sender_id, cp.user_id)
  ) INTO v_blocked;

  IF v_blocked THEN
    RAISE EXCEPTION 'You cannot message a user you have blocked or who has blocked you';
  END IF;
  RETURN NEW;
END; $$;

NOTIFY pgrst, 'reload schema';
