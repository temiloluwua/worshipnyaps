-- Allow event hosts to permanently delete their own events.
-- Previously only admins could hard-delete; hosts could only cancel
-- (status → 'cancelled'). This adds a DELETE RLS policy so the host
-- delete flow in EventDetailView can actually remove the row.

-- Drop the policy if it already exists from a previous partial migration.
drop policy if exists "Hosts can delete their own events" on events;

create policy "Hosts can delete their own events"
  on events
  for delete
  using (auth.uid() = host_id);
