/*
  # Add Bible Verse Column to Topics Table

  1. Changes
    - Add `bible_verse` column to store scripture references for each topic
    - Column is optional (nullable) to accommodate existing data

  2. Notes
    - This supports the topic discussion format with scripture references
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics' AND column_name = 'bible_verse'
  ) THEN
    ALTER TABLE topics ADD COLUMN bible_verse text;
  END IF;
END $$;
