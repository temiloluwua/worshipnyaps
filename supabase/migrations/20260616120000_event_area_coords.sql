/*
  # City-level event coordinates for the map

  We want every public event to appear on the map, including ones whose
  exact address is masked by RLS (general_area, attendees_only). The
  client used to join through `locations` to get lat/lng, which meant
  masked-address events were invisible on the map.

  Solution: store a *fuzzed* coordinate pair on the events row itself.
  - area_lat / area_lng are rounded to 1 decimal place (~11 km grid)
    with a small deterministic jitter (~±1.5 km) keyed off the event id
    so multiple events in the same city don't all stack on one pin.
  - A trigger keeps these in sync from `locations.latitude/longitude`.
  - The values live on `events`, which the client can read whenever the
    event itself is visible — no RLS on locations needed.

  Privacy: 1-decimal precision + jitter is "somewhere in this part of
  town". It never reveals a street address or block. The exact address
  still flows only via the existing `locations` RLS rules.
*/

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS area_lat double precision,
  ADD COLUMN IF NOT EXISTS area_lng double precision;

CREATE INDEX IF NOT EXISTS idx_events_area_coords
  ON public.events(area_lat, area_lng)
  WHERE area_lat IS NOT NULL AND area_lng IS NOT NULL;

-- Helper: deterministic jitter in ±0.015 degrees (~1.5 km) keyed on event id.
CREATE OR REPLACE FUNCTION public._event_area_jitter(p_event_id uuid, p_axis text)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT (
    (hashtext(p_event_id::text || ':' || p_axis) % 300 - 150)::double precision
  ) / 10000.0;
$$;

-- Trigger function: when an event is inserted/updated, look up the linked
-- location's coordinates and project them to the area grid.
-- SECURITY DEFINER so it can read locations regardless of caller RLS.
CREATE OR REPLACE FUNCTION public.set_event_area_coords()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
BEGIN
  IF NEW.location_id IS NULL THEN
    NEW.area_lat := NULL;
    NEW.area_lng := NULL;
    RETURN NEW;
  END IF;

  SELECT latitude, longitude INTO v_lat, v_lng
  FROM public.locations
  WHERE id = NEW.location_id;

  IF v_lat IS NULL OR v_lng IS NULL OR (v_lat = 0 AND v_lng = 0) THEN
    NEW.area_lat := NULL;
    NEW.area_lng := NULL;
    RETURN NEW;
  END IF;

  NEW.area_lat := round(v_lat::numeric, 1)::double precision
                  + public._event_area_jitter(COALESCE(NEW.id, gen_random_uuid()), 'lat');
  NEW.area_lng := round(v_lng::numeric, 1)::double precision
                  + public._event_area_jitter(COALESCE(NEW.id, gen_random_uuid()), 'lng');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_set_area_coords ON public.events;
CREATE TRIGGER events_set_area_coords
  BEFORE INSERT OR UPDATE OF location_id ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_event_area_coords();

-- If a location's coordinates change later, refresh every event that uses it.
CREATE OR REPLACE FUNCTION public.refresh_event_area_coords_for_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS DISTINCT FROM OLD.latitude
     OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
    UPDATE public.events
    SET area_lat = round(NEW.latitude::numeric, 1)::double precision
                   + public._event_area_jitter(id, 'lat'),
        area_lng = round(NEW.longitude::numeric, 1)::double precision
                   + public._event_area_jitter(id, 'lng')
    WHERE location_id = NEW.id
      AND NEW.latitude IS NOT NULL
      AND NEW.longitude IS NOT NULL
      AND NOT (NEW.latitude = 0 AND NEW.longitude = 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS locations_refresh_event_area_coords ON public.locations;
CREATE TRIGGER locations_refresh_event_area_coords
  AFTER UPDATE OF latitude, longitude ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.refresh_event_area_coords_for_location();

-- Backfill existing events.
UPDATE public.events e
SET area_lat = round(l.latitude::numeric, 1)::double precision
               + public._event_area_jitter(e.id, 'lat'),
    area_lng = round(l.longitude::numeric, 1)::double precision
               + public._event_area_jitter(e.id, 'lng')
FROM public.locations l
WHERE e.location_id = l.id
  AND l.latitude IS NOT NULL
  AND l.longitude IS NOT NULL
  AND NOT (l.latitude = 0 AND l.longitude = 0);

NOTIFY pgrst, 'reload schema';
