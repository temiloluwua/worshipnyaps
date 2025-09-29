/*
  # Add Bible Verse Column to Topics

  1. Changes
    - Add `bible_verse` column to topics table
    - Allow storing full Bible verse text alongside the reference
    - Update existing topics to have null bible_verse (can be filled later)

  2. Security
    - No changes to RLS policies needed
    - Column is optional and can be null
*/

-- Add bible_verse column to topics table
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS bible_verse text;

-- Add comment to describe the column
COMMENT ON COLUMN topics.bible_verse IS 'Full text of the Bible verse related to this topic';