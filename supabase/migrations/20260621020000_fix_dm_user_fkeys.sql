/*
  # Add public.users FKs so PostgREST can resolve DM embeds

  ## Why
  The Messages view fetches conversations / messages with embeds like
  `users:user_id (name, avatar_url)` and `sender:sender_id (...)`.
  Those embeds resolve to `public.users`, but the original FKs on
  conversation_participants.user_id and direct_messages.sender_id point at
  `auth.users`. PostgREST can't follow a FK into the unexposed auth schema,
  so the embed silently returns null — the conversation list shows
  "Unknown" with no avatar.

  ## What
  - Add a second FK from conversation_participants.user_id -> public.users(id).
  - Add a second FK from direct_messages.sender_id -> public.users(id).
  - public.users mirrors auth.users 1:1 via the existing signup trigger, so
    the FK check is satisfied for every existing row.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversation_participants_user_fkey'
      AND conrelid = 'public.conversation_participants'::regclass
  ) THEN
    ALTER TABLE public.conversation_participants
      ADD CONSTRAINT conversation_participants_user_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'direct_messages_sender_fkey'
      AND conrelid = 'public.direct_messages'::regclass
  ) THEN
    ALTER TABLE public.direct_messages
      ADD CONSTRAINT direct_messages_sender_fkey
      FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
