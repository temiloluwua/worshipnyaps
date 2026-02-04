/*
  # Fix Anonymous Access to Comments and Users

  1. Changes
    - Update comments SELECT policy to allow anonymous users to read comments
    - Update users SELECT policy to allow anonymous users to view profiles
    - Keep all write operations restricted to authenticated users
  
  2. Security
    - Anonymous users can browse comments and user profiles
    - Only authenticated users can create/edit/delete comments
    - Only authenticated users can update their own profiles
    - Maintains data integrity and security for write operations
*/

-- Fix comments table
DROP POLICY IF EXISTS "Authenticated users can read comments" ON comments;

CREATE POLICY "Anyone can read comments"
  ON comments
  FOR SELECT
  TO public
  USING (true);

-- Fix users table
DROP POLICY IF EXISTS "Users can read all profiles" ON users;

CREATE POLICY "Anyone can read profiles"
  ON users
  FOR SELECT
  TO public
  USING (true);
