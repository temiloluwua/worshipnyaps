/*
  # Require verified email to create content

  ## Why
  Supabase blocks unverified-email sign-ins by default — but only at the
  auth boundary. If anything ever loosens that (custom hooks, OAuth flow
  changes), we still want server-side proof that a poster's email was
  verified. This adds a belt-and-suspenders helper that any INSERT policy
  on user-generated content can call, and wires it into community_posts.

  ## What
  - SECURITY DEFINER helper auth.email_verified() returns true iff the
    caller's row in auth.users has email_confirmed_at set.
  - INSERT policy on community_posts requires email_verified().
  - Topics and comments left untouched for now (lower-risk surfaces and
    have additional gates). Easy to extend later by adding the same
    AND public.email_verified() to their INSERT policies.
*/

CREATE OR REPLACE FUNCTION public.email_verified()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_confirmed_at timestamptz;
BEGIN
  SELECT email_confirmed_at INTO v_confirmed_at
  FROM auth.users
  WHERE id = (select auth.uid());
  RETURN v_confirmed_at IS NOT NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.email_verified() TO authenticated;

DROP POLICY IF EXISTS "Anyone authenticated can post" ON public.community_posts;
CREATE POLICY "Verified users can post"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (select auth.uid())
    AND public.email_verified()
  );

NOTIFY pgrst, 'reload schema';
