/*
  # Allow events to be deleted without breaking user-to-user connections

  Two FKs to events(id) were created with the default NO ACTION, which
  blocks event deletion when any row references the event:

    - connection_requests.event_id  (which event the request originated at)
    - connections.met_at_event_id   (where two users first connected)

  Both are informational — the connection (or request) itself should
  outlive a deleted event. Switching both to ON DELETE SET NULL so the
  history is preserved with a null event reference.
*/

ALTER TABLE public.connection_requests
  DROP CONSTRAINT IF EXISTS connection_requests_event_id_fkey;

ALTER TABLE public.connection_requests
  ADD CONSTRAINT connection_requests_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.connections
  DROP CONSTRAINT IF EXISTS connections_met_at_event_id_fkey;

ALTER TABLE public.connections
  ADD CONSTRAINT connections_met_at_event_id_fkey
  FOREIGN KEY (met_at_event_id) REFERENCES public.events(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
