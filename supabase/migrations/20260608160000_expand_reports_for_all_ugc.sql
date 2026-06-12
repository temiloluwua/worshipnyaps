/*
  # Expand the reports table to cover every UGC surface

  Apple Guideline 1.2 requires a report mechanism within ~2 taps of every
  type of user-generated content. The original reports table only covered
  user / location / event. This migration extends it to cover:

  - topics (discussion posts)
  - comments (on topics)
  - direct_messages (DMs and event group chat messages)
  - event_announcements
  - event_help_requests

  We keep the existing reported_user_id / reported_event_id / reported_location_id
  columns and add new ones for each new entity, plus a `content_snapshot`
  JSONB so moderators see what was reported even if the original is later
  deleted or edited.
*/

-- Allow the new report types
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check
  CHECK (report_type IN (
    'user', 'location', 'event', 'topic', 'comment',
    'message', 'announcement', 'help_request'
  ));

-- Add columns for the new entity references (nullable since each report
-- only references one entity type)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reported_topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reported_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reported_message_id uuid REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reported_announcement_id uuid REFERENCES public.event_announcements(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reported_help_request_id bigint REFERENCES public.event_help_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_reports_topic ON public.reports(reported_topic_id) WHERE reported_topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_comment ON public.reports(reported_comment_id) WHERE reported_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_message ON public.reports(reported_message_id) WHERE reported_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);

-- RLS: any authenticated user can submit a report on themselves' behalf
DROP POLICY IF EXISTS "Users can submit reports" ON public.reports;
CREATE POLICY "Users can submit reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- RLS: reporters can read their own reports (for status tracking)
DROP POLICY IF EXISTS "Reporters can read their own reports" ON public.reports;
CREATE POLICY "Reporters can read their own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

NOTIFY pgrst, 'reload schema';
