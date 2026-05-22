/*
  # Add delete_user_account() RPC

  1. Purpose
    - Lets an authenticated user permanently delete their own account from the client.
    - Required by App Store guideline 5.1.1(v): apps that support account creation
      must also let the user initiate account deletion from within the app.

  2. Behavior
    - Runs with SECURITY DEFINER so it can delete from auth.users.
    - Only deletes the row that matches auth.uid() — a user can never delete anyone else.
    - Deletion of auth.users cascades to public.users (FK ON DELETE CASCADE), which in
      turn cascades to any user-owned content with ON DELETE CASCADE foreign keys.

  3. Permissions
    - EXECUTE granted to the `authenticated` role only.
*/

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
