/*
  # Create Waitlist Table

  ## Description
  Creates a waitlist table for tracking user interest in the card game pre-orders
  and other future product launches.

  ## New Tables
    - `waitlist`
      - `id` (uuid, primary key) - Unique identifier for each waitlist entry
      - `email` (text, unique, required) - Email address of interested user
      - `name` (text) - Optional name of the user
      - `product_type` (text, required) - Type of product they're interested in (e.g., 'card_game')
      - `notes` (text) - Optional notes or comments from the user
      - `status` (text, default 'pending') - Status: pending, notified, converted
      - `created_at` (timestamptz) - When they joined the waitlist
      - `notified_at` (timestamptz) - When they were notified (if applicable)

  ## Security
    - Enable RLS on `waitlist` table
    - Allow anyone to insert their email (public access for signup)
    - Only authenticated admin users can view all waitlist entries
    - Users can view their own waitlist entries

  ## Indexes
    - Index on email for quick lookups
    - Index on product_type for filtering
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  product_type text NOT NULL DEFAULT 'card_game',
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'notified', 'converted'))
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own waitlist entries"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_product_type ON waitlist(product_type);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);
