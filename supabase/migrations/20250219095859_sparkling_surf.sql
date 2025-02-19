/*
  # Fix profile policies for authentication

  1. Changes
    - Add public read policy for profiles
    - Improve existing policies
    - Add better policy descriptions

  2. Security
    - Maintain RLS protection while allowing necessary access
    - Ensure authenticated users can access their own profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new comprehensive policies
CREATE POLICY "Allow users to read any profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);