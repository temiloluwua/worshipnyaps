/*
  # Remove duplicate preselected topics

  ## Summary
  The topics table had duplicate entries for the same preselected discussion topics
  (inserted twice). This migration keeps only the most recent version of each
  duplicated topic title, removing the older copies.

  1. Changes
    - Deletes older duplicate rows from the `topics` table where the same title
      appears more than once under `topic_type = 'preselected'`
    - Keeps the most recently created entry for each title
*/

DELETE FROM topics
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at ASC) AS rn
    FROM topics
    WHERE topic_type = 'preselected'
  ) ranked
  WHERE rn > 1
);
