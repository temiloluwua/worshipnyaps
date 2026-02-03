/*
  # Add Topic Type to Topics Table

  1. Changes
    - Add `topic_type` column to distinguish between preselected and community topics
    - Preselected topics: Admin-curated discussion topics with Bible verses (card game style)
    - Community topics: User-generated posts for public feed (Twitter-style)
    - Default existing topics to 'preselected' type
  
  2. Security
    - Only admins can create preselected topics
    - All authenticated users can create community topics
*/

-- Add topic_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics' AND column_name = 'topic_type'
  ) THEN
    ALTER TABLE topics 
    ADD COLUMN topic_type text NOT NULL DEFAULT 'preselected'
    CHECK (topic_type IN ('preselected', 'community'));
  END IF;
END $$;

-- Update existing topics to be preselected by default
UPDATE topics SET topic_type = 'preselected' WHERE topic_type IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_topics_type ON topics(topic_type);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);
