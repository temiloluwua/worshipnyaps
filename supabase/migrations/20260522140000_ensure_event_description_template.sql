/*
  # Ensure events.description_template exists

  The structured event description template (whatToExpect, whatToBring,
  parkingDirections, contactInfo, specialNotes) is used by EditEventModal,
  LocationsView.HostEventModal, and EventDetailView, but the column was
  never created on the live Supabase project.

  Idempotent: safe to run even if the column already exists.
*/

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description_template jsonb;

COMMENT ON COLUMN public.events.description_template IS
  'Optional structured description template for the event (whatToExpect, whatToBring, parkingDirections, contactInfo, specialNotes).';

NOTIFY pgrst, 'reload schema';
