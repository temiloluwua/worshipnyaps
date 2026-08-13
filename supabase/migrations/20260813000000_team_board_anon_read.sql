/*
  # Let logged-out team-link visitors read the team board

  A host shares a team link (/event/{id}?team={code}) so people can see what
  help the event needs BEFORE they make an account or RSVP. get_team_board is a
  SECURITY DEFINER read already gated by the secret team_code, but it was only
  granted to `authenticated`, so a signed-out visitor got nothing.

  Grant it to `anon` too. Possession of the team_code (a random secret in the
  link) is the authorization. Claiming a role still requires an account —
  claim_team_role remains authenticated-only — so this exposes read/visibility
  only, never a write.
*/

GRANT EXECUTE ON FUNCTION public.get_team_board(uuid, text) TO anon;

NOTIFY pgrst, 'reload schema';
