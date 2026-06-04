/*
  # Bible Study vs Yap event types + structured fields

  ## Changes
  - events.event_type: 'bible_study' | 'yap' (default bible_study for back-compat)
  - events.study_topic: text — what's being studied (Bible Study only)
  - events.session_purpose: text — why this gathering matters (Bible Study only)
  - events.location_type: text enum {home, church, park, cafe, online}
  - events.opening_ritual / closing_ritual: text
  - events.guest_covenant: text — group agreement displayed in RSVP disclaimer
  - events.yap_vibe: text — games / food / sports / music / hanging (Yap only)
  - events.bring_note: text — "bring X" reminder (Yap only)

  Idempotent.
*/

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'bible_study'
    CHECK (event_type IN ('bible_study', 'yap')),
  ADD COLUMN IF NOT EXISTS study_topic text,
  ADD COLUMN IF NOT EXISTS session_purpose text,
  ADD COLUMN IF NOT EXISTS location_type text
    CHECK (location_type IS NULL OR location_type IN ('home', 'church', 'park', 'cafe', 'online')),
  ADD COLUMN IF NOT EXISTS opening_ritual text,
  ADD COLUMN IF NOT EXISTS closing_ritual text,
  ADD COLUMN IF NOT EXISTS guest_covenant text,
  ADD COLUMN IF NOT EXISTS yap_vibe text,
  ADD COLUMN IF NOT EXISTS bring_note text;

NOTIFY pgrst, 'reload schema';
