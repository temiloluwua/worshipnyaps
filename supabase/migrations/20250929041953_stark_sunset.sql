/*
  # Enable Google Authentication

  This migration enables Google OAuth provider for authentication.
  
  Note: You'll also need to configure Google OAuth in your Supabase dashboard:
  1. Go to Authentication > Providers
  2. Enable Google provider
  3. Add your Google OAuth credentials (Client ID and Client Secret)
  4. Set authorized redirect URIs
*/

-- Enable Google provider (this is done via Supabase dashboard, but we document it here)
-- The actual configuration must be done in the Supabase dashboard under:
-- Authentication > Providers > Google

-- Ensure users table can handle OAuth users
DO $$
BEGIN
  -- Add any additional columns needed for OAuth users if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'provider'
  ) THEN
    ALTER TABLE users ADD COLUMN provider text DEFAULT 'email';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE users ADD COLUMN provider_id text;
  END IF;
END $$;

-- Update the handle_new_user function to work with OAuth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    phone, 
    role, 
    is_approved,
    provider,
    provider_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone',
    'member',
    true, -- Auto-approve OAuth users
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    NEW.app_metadata->>'provider_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', users.name),
    email = NEW.email,
    provider = COALESCE(NEW.app_metadata->>'provider', users.provider),
    provider_id = COALESCE(NEW.app_metadata->>'provider_id', users.provider_id),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;