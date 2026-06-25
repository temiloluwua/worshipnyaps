/*
  # One-way follows (asymmetric, lighter than connections)

  ## Why
  Connections (the mutual-friend graph) grant access to friends_only events
  and friends_only posts. Some users want to *just* see another user's
  public posts without becoming friends — like Twitter/X. This table is the
  asymmetric counterpart: A follows B means A sees B's public community
  posts in their Community feed. It does NOT grant any access beyond what
  visibility='public' already grants.

  ## What
  - follows(follower_id -> followed_id) with timestamps + uniqueness.
  - RLS:
    * Anyone authenticated can SEE follow edges (so follower/following
      counts are public, matching the pattern other social apps use).
    * You can only INSERT/DELETE rows where YOU are the follower.
    * You cannot follow yourself.
  - Indexes for both directions so we can answer "who do I follow" and
    "who follows me" in O(1) lookups.
*/

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows(followed_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read follows" ON public.follows;
CREATE POLICY "Anyone authenticated can read follows"
  ON public.follows FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can follow on their own behalf" ON public.follows;
CREATE POLICY "Users can follow on their own behalf"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unfollow on their own behalf" ON public.follows;
CREATE POLICY "Users can unfollow on their own behalf"
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = (select auth.uid()));
