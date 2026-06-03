/*
  # Add visibility to topics

  ## Purpose
  Lets users post community topics that are only visible to their friends,
  mirroring the events.visibility pattern.

  ## Changes
  - topics.visibility: text enum 'public' | 'friends_only', default 'public'
  - SELECT policy updated so 'friends_only' rows are visible to:
    - the author
    - users connected (in either direction) with the author

  Idempotent.
*/

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'friends_only'));

DROP POLICY IF EXISTS "Anyone authenticated can view topics" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can view topics" ON public.topics;
DROP POLICY IF EXISTS "Topics are viewable based on visibility" ON public.topics;

CREATE POLICY "Topics are viewable based on visibility"
  ON public.topics FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.connections c
      WHERE (
        (c.user_id = auth.uid() AND c.connected_user_id = topics.author_id)
        OR (c.connected_user_id = auth.uid() AND c.user_id = topics.author_id)
      )
      AND c.status = 'active'
    )
  );

NOTIFY pgrst, 'reload schema';
