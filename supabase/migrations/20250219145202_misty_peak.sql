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
  -- Add delay to ensure auth user is fully created
  PERFORM pg_sleep(0.5);

  -- Validate user metadata exists
  IF NEW.raw_user_meta_data IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate required fields
  IF NEW.raw_user_meta_data->>'full_name' IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.raw_user_meta_data->>'user_type' IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate and cast user_type
  BEGIN
    profile_user_type := (NEW.raw_user_meta_data->>'user_type')::user_type;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NEW;
  END;

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
    WHEN OTHERS THEN
      -- Log error but don't prevent user creation
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();