/*
  # Add Faith Stage to User Profiles

  1. Changes
    - Add faith_stage column to users: an optional self-described point in the
      user's faith journey, shown on their profile.
    - Allowed values: curious, new, growing, mature (see src/lib/faithStages.ts).

  2. Notes
    - Optional (nullable) — users can skip it during onboarding.
    - CHECK constraint keeps it to the known set while allowing NULL.
    - Idempotent so it's safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'faith_stage'
  ) THEN
    ALTER TABLE users ADD COLUMN faith_stage text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'users' AND constraint_name = 'users_faith_stage_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_faith_stage_check
      CHECK (faith_stage IS NULL OR faith_stage IN ('curious', 'new', 'growing', 'mature'));
  END IF;
END $$;
