-- Drop and recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Validate required fields
  IF NEW.raw_user_meta_data->>'full_name' IS NULL THEN
    RAISE EXCEPTION 'full_name is required';
  END IF;
  
  IF NEW.raw_user_meta_data->>'user_type' IS NULL THEN
    RAISE EXCEPTION 'user_type is required';
  END IF;

  -- Validate user_type enum value
  IF NOT (NEW.raw_user_meta_data->>'user_type' IN ('patient', 'doctor', 'lab')) THEN
    RAISE EXCEPTION 'Invalid user_type. Must be patient, doctor, or lab';
  END IF;

  -- Insert profile with error handling
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
      (NEW.raw_user_meta_data->>'user_type')::user_type,
      NEW.raw_user_meta_data->>'specialty',
      NEW.raw_user_meta_data->>'license_number'
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'A profile with this email already exists';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add helpful indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND indexname = 'profiles_email_idx'
  ) THEN
    CREATE INDEX profiles_email_idx ON profiles(email);
  END IF;
END $$;