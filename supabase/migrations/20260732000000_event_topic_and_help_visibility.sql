/*
  # Attach a topic to an event + make help requests visible pre-RSVP

  1. events.topic_id — link a discussion topic (the swipeable cards) to an
     event, e.g. a Yap that centers on a topic.
  2. Help requests / bring-items were only readable by host/cohost/attendees,
     so prospective attendees couldn't see what help was needed before RSVPing.
     Add a permissive SELECT policy: anyone who can SEE the event (the events
     RLS enforces that) can read its open help requests + food items.
*/

-- 1. Topic on events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_topic ON public.events(topic_id) WHERE topic_id IS NOT NULL;

-- 2. Help/food visible to anyone who can view the event (permissive → only
--    grants; the EXISTS(events) subquery is gated by the events RLS).
DROP POLICY IF EXISTS "help_requests_visible_with_event" ON public.event_help_requests;
CREATE POLICY "help_requests_visible_with_event" ON public.event_help_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_help_requests.event_id));

DROP POLICY IF EXISTS "food_items_visible_with_event" ON public.food_items;
CREATE POLICY "food_items_visible_with_event" ON public.food_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = food_items.event_id));

NOTIFY pgrst, 'reload schema';
