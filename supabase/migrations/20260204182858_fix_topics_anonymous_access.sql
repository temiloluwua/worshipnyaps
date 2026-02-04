/*
  # Fix Anonymous Access to Topics

  1. Changes
    - Update topics SELECT policy to allow both authenticated and anonymous users to read topics
    - Keep all write operations (INSERT, UPDATE, DELETE) restricted to authenticated users only
  
  2. Security
    - Anonymous users can browse and view topics
    - Only authenticated users can create, edit, or delete topics
    - Maintains data integrity and security for write operations
*/

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read topics" ON topics;

-- Create new policy allowing both authenticated and anonymous users to read
CREATE POLICY "Anyone can read topics"
  ON topics
  FOR SELECT
  TO public
  USING (true);
