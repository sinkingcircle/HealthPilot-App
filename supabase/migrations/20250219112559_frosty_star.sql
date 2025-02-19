/*
  # Fix user registration process

  1. Changes
    - Add better error handling in the trigger function
    - Add proper validation for all fields
    - Add proper error messages
    - Remove test user creation
    - Add proper transaction handling
    
  2. Security
    - Ensure proper error messages are returned
    - Validate all input data
    - Ensure atomic operations
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  profile_user_type user_type;
BEGIN
  -- Validate user metadata exists
  IF NEW.raw_user_meta_data IS NULL THEN
    RAISE EXCEPTION 'User metadata is required';
  END IF;

  -- Validate required fields
  IF NEW.raw_user_meta_data->>'full_name' IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  
  IF NEW.raw_user_meta_data->>'user_type' IS NULL THEN
    RAISE EXCEPTION 'User type is required';
  END IF;

  -- Validate and cast user_type
  BEGIN
    profile_user_type := (NEW.raw_user_meta_data->>'user_type')::user_type;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid user type. Must be patient, doctor, or lab';
  END;

  -- Validate professional requirements
  IF profile_user_type IN ('doctor', 'lab') THEN
    IF NEW.raw_user_meta_data->>'license_number' IS NULL THEN
      RAISE EXCEPTION 'License number is required for % accounts', profile_user_type;
    END IF;
  END IF;

  IF profile_user_type = 'doctor' AND NEW.raw_user_meta_data->>'specialty' IS NULL THEN
    RAISE EXCEPTION 'Specialty is required for doctor accounts';
  END IF;

  -- Insert profile with detailed error handling
  BEGIN
    INSERT INTO public.profiles (
      user_id,
      email,
      full_name,
      user_type,
      specialty,
      license_number
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      profile_user_type,
      CASE 
        WHEN profile_user_type = 'doctor' THEN NEW.raw_user_meta_data->>'specialty'
        ELSE NULL
      END,
      CASE 
        WHEN profile_user_type IN ('doctor', 'lab') THEN NEW.raw_user_meta_data->>'license_number'
        ELSE NULL
      END
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'An account with this email already exists';
    WHEN check_violation THEN
      RAISE EXCEPTION 'Invalid data provided for profile creation';
    WHEN not_null_violation THEN
      RAISE EXCEPTION 'Missing required field for profile creation';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure indexes exist
DO $$ 
BEGIN
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
END $$;