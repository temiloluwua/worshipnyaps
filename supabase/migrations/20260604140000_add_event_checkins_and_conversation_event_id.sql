/*
  # Add event_checkins table + conversations.event_id column

  CheckInButton references event_checkins which never had a migration.
  Event group chats use conversations.event_id which was defined in an older
  migration that was never applied on the live project.

  Idempotent.
*/

-- =====================================================
-- event_checkins
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  check_in_method text DEFAULT 'self' CHECK (check_in_method IN ('self', 'host', 'qr')),
  checked_in_at timestamptz DEFAULT now(),
  checked_out_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user ON public.event_checkins(user_id);

ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone in the event can view check-ins" ON public.event_checkins;
CREATE POLICY "Anyone in the event can view check-ins"
  ON public.event_checkins FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_attendees a WHERE a.event_id = event_checkins.event_id AND a.user_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can check themselves in" ON public.event_checkins;
CREATE POLICY "Users can check themselves in"
  ON public.event_checkins FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_cohosts c WHERE c.event_id = event_checkins.event_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can check themselves out" ON public.event_checkins;
CREATE POLICY "Users can check themselves out"
  ON public.event_checkins FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
  );

-- =====================================================
-- conversations.event_id
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE public.conversations
      ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
    CREATE INDEX idx_conversations_event_id ON public.conversations(event_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
