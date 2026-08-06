/*
  # Pin search_path on every SECURITY DEFINER function

  A SECURITY DEFINER function without a fixed search_path runs with the
  caller's search_path, which lets a malicious caller shadow a referenced
  object (e.g. a table or operator) with one in a schema they control and
  hijack the elevated execution — the classic Postgres privilege-escalation
  vector Supabase's linter flags ("Function Search Path Mutable").

  Rather than rewrite each function body, ALTER every definer function in the
  public schema to pin `search_path = public, pg_temp`. Generic + idempotent,
  so it also covers any definer functions added by earlier migrations that
  forgot to set it.
*/

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef                       -- SECURITY DEFINER only
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
