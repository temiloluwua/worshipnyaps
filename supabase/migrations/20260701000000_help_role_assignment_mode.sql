/*
  # Assign-only vs. open-for-volunteers roles

  Hosts want to distinguish between roles anyone can volunteer for
  (setup, tech, snacks) and roles they intend to hand-pick (worship
  leader, main teacher). Today every role is treated as "open" unless
  the host pre-assigns someone at creation time — there's no way to
  reserve a role for future assignment without exposing a Volunteer
  button to everyone.

  Adds `open_to_volunteers` (default TRUE for backward compatibility)
  to both event_help_requests and food_items. When FALSE, only the
  host can fill the slot; attendees will see a "Reserved" label and
  no volunteer button.
*/

ALTER TABLE public.event_help_requests
  ADD COLUMN IF NOT EXISTS open_to_volunteers boolean NOT NULL DEFAULT true;

ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS open_to_volunteers boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
