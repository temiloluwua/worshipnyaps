/*
  # Ensure topic_requests table + add FK to public.users

  ## Why
  - The original migration that created topic_requests (20260227000802) may not
    have been applied to the live project, so RequestTopicModal's insert fails.
  - Its `requested_by` only had a FK to auth.users(id). PostgREST needs a FK to
    public.users(id) for the embedded `requester:users(...)` join used by
    AdminTopicReviewPanel. Adding it lets the admin queue load properly.

  Idempotent: safe to run multiple times.
*/

CREATE TABLE IF NOT EXISTS public.topic_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  bible_verse text,
  category text NOT NULL DEFAULT 'life-questions',
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE public.topic_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'topic_requests_requested_by_users_fkey'
  ) THEN
    ALTER TABLE public.topic_requests
      ADD CONSTRAINT topic_requests_requested_by_users_fkey
      FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view their own topic requests" ON public.topic_requests;
CREATE POLICY "Users can view their own topic requests"
  ON public.topic_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view all topic requests" ON public.topic_requests;
CREATE POLICY "Admins can view all topic requests"
  ON public.topic_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create topic requests" ON public.topic_requests;
CREATE POLICY "Authenticated users can create topic requests"
  ON public.topic_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update topic requests" ON public.topic_requests;
CREATE POLICY "Admins can update topic requests"
  ON public.topic_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_topic_requests_status ON public.topic_requests(status);
CREATE INDEX IF NOT EXISTS idx_topic_requests_requested_by ON public.topic_requests(requested_by);

NOTIFY pgrst, 'reload schema';
