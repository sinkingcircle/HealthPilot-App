/*
  # Simplify profiles table and remove code system

  1. Changes
    - Remove code column and related constraints
    - Remove code generation function and trigger
    - Keep essential fields only
  2. Security
    - Maintain existing RLS policies
*/

-- Remove code-related items
ALTER TABLE profiles DROP COLUMN IF EXISTS code;
DROP FUNCTION IF EXISTS generate_user_code CASCADE;
DROP FUNCTION IF EXISTS set_user_code CASCADE;

-- Update profiles table constraints
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS proper_code;

-- Add updated indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);