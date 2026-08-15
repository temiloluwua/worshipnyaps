/*
  # Let attendees add a potluck item they're bringing

  Until now only the host (or hospitality coordinator) could add food items
  (INSERT policy in 20250826013427). This adds a self-serve potluck path: any
  signed-in user who can see the event may add a food item they are personally
  bringing, and remove one they added.

  Guardrails:
  - INSERT only with assigned_to = auth.uid() — you can add an item you're
    bringing, never assign it to someone else.
  - Gated by EXISTS(events) so the events RLS still decides which events are
    visible/addable (public, friends-only for connections, etc.).
  - DELETE limited to your own items, so a mistaken add can be undone without
    touching host-managed slots.
*/

DROP POLICY IF EXISTS "Users can add their own food item" ON public.food_items;
CREATE POLICY "Users can add their own food item"
  ON public.food_items FOR INSERT TO authenticated
  WITH CHECK (
    assigned_to = auth.uid()
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = food_items.event_id)
  );

DROP POLICY IF EXISTS "Users can remove their own food item" ON public.food_items;
CREATE POLICY "Users can remove their own food item"
  ON public.food_items FOR DELETE TO authenticated
  USING (assigned_to = auth.uid());

NOTIFY pgrst, 'reload schema';
