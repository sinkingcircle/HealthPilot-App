/*
  # Initial Schema Setup for HealthPilot

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `user_type` (enum: patient, doctor, lab)
      - `code` (text, unique identifier for each user)
      - `full_name` (text)
      - `email` (text)
      - `created_at` (timestamp)
      - `specialty` (text, for doctors)
      - `license_number` (text, for doctors and labs)
      - `address` (text)
      - `phone` (text)

  2. Security
    - Enable RLS on `profiles` table
    - Add policies for authenticated users to read and update their own data
*/

-- Create enum for user types
CREATE TYPE user_type AS ENUM ('patient', 'doctor', 'lab');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  user_type user_type NOT NULL,
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  specialty text,
  license_number text,
  address text,
  phone text,
  CONSTRAINT proper_code CHECK (
    CASE
      WHEN user_type = 'patient' THEN code ~ '^P[0-9]{6}$'
      WHEN user_type = 'doctor' THEN code ~ '^D[0-9]{6}$'
      WHEN user_type = 'lab' THEN code ~ '^L[0-9]{6}$'
    END
  )
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to generate unique user codes
CREATE OR REPLACE FUNCTION generate_user_code(user_type_param user_type)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
  new_code text;
  code_exists boolean;
BEGIN
  -- Set prefix based on user type
  prefix := CASE
    WHEN user_type_param = 'patient' THEN 'P'
    WHEN user_type_param = 'doctor' THEN 'D'
    WHEN user_type_param = 'lab' THEN 'L'
  END;

  -- Generate codes until a unique one is found
  LOOP
    -- Generate a random 6-digit number
    new_code := prefix || lpad(floor(random() * 1000000)::text, 6, '0');
    
    -- Check if code exists
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE code = new_code
    ) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create trigger to automatically generate user code
CREATE OR REPLACE FUNCTION set_user_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_user_code(NEW.user_type);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_user_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_code();