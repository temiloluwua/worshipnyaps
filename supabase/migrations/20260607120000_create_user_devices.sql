/*
  # user_devices — push notification token registry

  Stores one row per (user, device) pair. Phase 1 just captures tokens.
  Phase 3 (when the APNs key is set up) will read from this table to send
  pushes.

  - token: the APNs/FCM token string (unique — overwrite old user if
    the same physical device switches accounts)
  - platform: 'ios' | 'android' | 'web'
  - last_seen_at: last time the client refreshed its registration
  - notifications_enabled: user can mute pushes without unregistering

  RLS:
  - Users can read/write only their own device rows.
  - Phase 3 Edge Function will use the service role and bypass RLS.
*/

CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version text,
  notifications_enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON public.user_devices(token);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own devices" ON public.user_devices;
CREATE POLICY "Users can read their own devices"
  ON public.user_devices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own devices" ON public.user_devices;
CREATE POLICY "Users can insert their own devices"
  ON public.user_devices FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own devices" ON public.user_devices;
CREATE POLICY "Users can update their own devices"
  ON public.user_devices FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own devices" ON public.user_devices;
CREATE POLICY "Users can delete their own devices"
  ON public.user_devices FOR DELETE TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
