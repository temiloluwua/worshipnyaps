/*
  # Server-side address masking for restricted events

  Threat from the security audit: `locations.address` and `locations.lat/lng`
  are returned in full to anyone who can query the locations table — the
  client masks them based on `events.address_visibility` but a direct API
  / curl request bypasses that.

  Fix without redesigning every event query: tighten the locations SELECT
  policy so a row is only returned when the caller is allowed to see its
  full address for at least one event that uses it.

  Rules:
  - Host or co-host of an event using the location → always allowed
  - Event using the location has `address_visibility = 'public'` → allowed
  - Event using the location has `address_visibility = 'attendees_only'`
    AND caller is a registered/attended attendee → allowed
  - Event using the location has `address_visibility = 'general_area'`
    → NEVER returned via the locations join (client falls back to the
    location-type label like "🏠 Home")
  - Anon role: only locations of fully public events with public address

  Because the row is all-or-nothing, the client's existing
  `formatLocationNameOrType(event)` helper degrades gracefully: when
  `event.locations` is null, it shows the location-type emoji label.
*/

DROP POLICY IF EXISTS "Authenticated users can read approved locations" ON public.locations;
DROP POLICY IF EXISTS "Locations visible to authorized event viewers" ON public.locations;
DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;
DROP POLICY IF EXISTS "Locations are viewable by all" ON public.locations;

CREATE POLICY "Locations visible to authorized event viewers"
  ON public.locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.location_id = locations.id
        AND public.can_user_see_event(e.id, auth.uid())
        AND (
          e.host_id = auth.uid()
          OR public.is_event_cohost(e.id, auth.uid())
          OR e.address_visibility = 'public'
          OR (
            e.address_visibility = 'attendees_only'
            AND public.is_event_attendee(e.id, auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS "Anon sees locations of fully public events" ON public.locations;
CREATE POLICY "Anon sees locations of fully public events"
  ON public.locations FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.location_id = locations.id
        AND e.visibility = 'public'
        AND e.address_visibility = 'public'
    )
  );

NOTIFY pgrst, 'reload schema';
