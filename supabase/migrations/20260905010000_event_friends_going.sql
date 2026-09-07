/*
  # "N friends going" social proof for events

  For a batch of events, return how many of the viewer's own connections are
  attending (+ one sample name). SECURITY DEFINER so it can read attendees, but
  it only ever counts the caller's own friends — never exposes anyone else.
*/

CREATE OR REPLACE FUNCTION public.event_friends_going(p_event_ids uuid[])
RETURNS TABLE (event_id uuid, going_count int, sample_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT a.event_id,
         COUNT(*)::int AS going_count,
         (ARRAY_AGG(u.name ORDER BY u.name))[1] AS sample_name
  FROM event_attendees a
  JOIN users u ON u.id = a.user_id
  WHERE a.event_id = ANY(p_event_ids)
    AND a.status IN ('registered', 'attended')
    AND a.user_id <> auth.uid()
    AND public.users_are_connected(a.user_id, auth.uid())
  GROUP BY a.event_id;
$$;
GRANT EXECUTE ON FUNCTION public.event_friends_going(uuid[]) TO authenticated;
