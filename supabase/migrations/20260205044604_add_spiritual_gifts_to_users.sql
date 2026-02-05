/*
  # Add Spiritual Gifts to User Profiles

  1. Changes
    - Add spiritual_gifts column to users table to store array of spiritual gifts
    - Supported gifts: connection, hosting, worship, teaching, evangelism, creative
  
  2. Notes
    - Users can select multiple spiritual gifts
    - Field is optional (nullable)
    - Stored as text array for flexibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'spiritual_gifts'
  ) THEN
    ALTER TABLE users ADD COLUMN spiritual_gifts text[] DEFAULT '{}';
  END IF;
END $$;
