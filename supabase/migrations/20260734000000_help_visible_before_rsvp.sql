/*
  # Help requests + food items visible before RSVP (and to link guests)

  Prospective attendees should see what help an event needs BEFORE they RSVP,
  so they can volunteer as their reason to come. The prior policy
  (20260732) only granted SELECT to `authenticated`, so a guest who opens a
  shared event/team link before signing in still saw nothing. Re-create the
  permissive SELECT policies for both `authenticated` and `anon` — access is
  still gated by the events RLS via the EXISTS(events) subquery, so this only
  exposes help/food for events the viewer is already allowed to see.

  Idempotent: safe to run whether or not 20260732 was applied.
*/

DROP POLICY IF EXISTS "help_requests_visible_with_event" ON public.event_help_requests;
CREATE POLICY "help_requests_visible_with_event" ON public.event_help_requests FOR SELECT TO authenticated, anon
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_help_requests.event_id));

DROP POLICY IF EXISTS "food_items_visible_with_event" ON public.food_items;
CREATE POLICY "food_items_visible_with_event" ON public.food_items FOR SELECT TO authenticated, anon
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = food_items.event_id));

NOTIFY pgrst, 'reload schema';
