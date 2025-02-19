/*
  # Update RLS policies for profiles table

  1. Changes
    - Simplify policies for better security
    - Enable public registration
    - Restrict profile access appropriately
  2. Security
    - Allow public registration
    - Authenticated users can read profiles
    - Users can only update their own profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to read any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable profile creation during registration" ON profiles;
DROP POLICY IF EXISTS "Public insert access for profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;

-- Create new comprehensive policies
CREATE POLICY "Allow public registration"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);