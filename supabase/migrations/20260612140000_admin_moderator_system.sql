/*
  # Admin / Moderator system

  - Extend users.role to allow 'moderator' alongside the existing
    member / host / admin
  - is_staff(uid) helper: true if user is admin or moderator
  - is_admin(uid) helper: true if user is admin (used for promoting/demoting)
  - Reports: staff can SELECT all open reports and UPDATE status
  - Topic requests: staff can SELECT all pending and UPDATE status
  - Only admin can change users.role via UPDATE
*/

-- ----------------------------------------------------------------------------
-- 1. Extend role enum
-- ----------------------------------------------------------------------------
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('member', 'host', 'moderator', 'admin'));

-- ----------------------------------------------------------------------------
-- 2. Helpers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  RETURN v_role IN ('admin', 'moderator');
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  RETURN v_role = 'admin';
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Reports: staff read + update
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can read all reports" ON public.reports;
CREATE POLICY "Staff can read all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update reports" ON public.reports;
CREATE POLICY "Staff can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Topic requests: staff read + update
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can read topic requests" ON public.topic_requests;
CREATE POLICY "Staff can read topic requests"
  ON public.topic_requests FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.is_staff(auth.uid())
  );

DROP POLICY IF EXISTS "Staff can update topic requests" ON public.topic_requests;
CREATE POLICY "Staff can update topic requests"
  ON public.topic_requests FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Only admin can change a user's role
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can update user roles" ON public.users;
CREATE POLICY "Admin can update user roles"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';
