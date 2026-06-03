/*
  # Add create_group_conversation RPC

  1. Purpose
    - The conversation_participants INSERT policy only lets a user add THEMSELVES
      (`auth.uid() = user_id`). That breaks group chat creation, which needs to
      insert rows for multiple other users in one shot.
    - This SECURITY DEFINER function does the inserts on the caller's behalf
      while still ensuring auth.uid() is recorded as a participant. Safer than
      loosening the underlying RLS policy.

  2. Behavior
    - Creates a new group conversation with the given name.
    - Adds the caller as a participant.
    - Adds the passed list of participant user_ids (de-duplicated, excluding
      the caller).
    - Returns the new conversation id.
    - Throws if not authenticated or if no other participants supplied.

  3. Permissions
    - EXECUTE granted to `authenticated` only.
*/

CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_name text,
  p_participant_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  new_conv_id uuid;
  unique_ids uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_participant_ids IS NULL OR array_length(p_participant_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one other participant is required';
  END IF;

  -- De-dupe and remove the caller (we'll add them explicitly)
  SELECT array_agg(DISTINCT id)
  INTO unique_ids
  FROM unnest(p_participant_ids) AS id
  WHERE id IS NOT NULL AND id <> current_user_id;

  IF unique_ids IS NULL OR array_length(unique_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one other participant is required';
  END IF;

  INSERT INTO public.conversations (is_group, name)
  VALUES (true, p_name)
  RETURNING id INTO new_conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (new_conv_id, current_user_id);

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT new_conv_id, uid FROM unnest(unique_ids) AS uid;

  RETURN new_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
