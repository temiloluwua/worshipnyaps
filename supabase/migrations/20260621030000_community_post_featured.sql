/*
  # Moderator/admin "Feature on search" power for community posts

  ## Why
  Authors can already pin a post to the top of their own feed via
  `community_posts.is_pinned`. The team wants a separate editorial concept:
  staff (admin/moderator) can boost a post so it appears in a Featured rail
  on the Search page. Keeping the two flags separate prevents conflating an
  author's self-pin with a staff editorial pick.

  ## What
  - Add `is_featured` boolean, `featured_at` timestamptz, `featured_by` uuid
    on `community_posts`.
  - Add a staff-only UPDATE policy that allows flipping ONLY the new
    featured_* columns (the existing "Authors can edit their posts" policy
    keeps authors out of the featured fields via its WITH CHECK on author_id).
  - Partial index for fast Featured rail lookups.
*/

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_by uuid REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_community_posts_featured
  ON public.community_posts(featured_at DESC)
  WHERE is_featured = true;

DROP POLICY IF EXISTS "Staff can feature community posts" ON public.community_posts;
CREATE POLICY "Staff can feature community posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (public.is_staff((select auth.uid())))
  WITH CHECK (public.is_staff((select auth.uid())));

NOTIFY pgrst, 'reload schema';
