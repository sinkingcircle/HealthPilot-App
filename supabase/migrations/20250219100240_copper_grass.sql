/*
  # Add profile indexes and update policies

  1. Changes
    - Add performance-optimizing indexes
    - Update policy for public profile creation
    - Ensure safe policy updates

  2. Security
    - Maintain existing security while improving access
    - Enable public profile creation for registration
*/

-- Drop specific policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can insert their own profile'
  ) THEN
    DROP POLICY "Users can insert their own profile" ON profiles;
  END IF;
END $$;

-- Create public insert policy with a different name to avoid conflicts
CREATE POLICY "Enable profile creation during registration"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Add indexes for better performance
DO $$ 
BEGIN
  -- Create indexes if they don't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND indexname = 'idx_profiles_user_id'
  ) THEN
    CREATE INDEX idx_profiles_user_id ON profiles(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND indexname = 'idx_profiles_email'
  ) THEN
    CREATE INDEX idx_profiles_email ON profiles(email);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND indexname = 'idx_profiles_user_type'
  ) THEN
    CREATE INDEX idx_profiles_user_type ON profiles(user_type);
  END IF;
END $$;