-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle profile creation with better error handling
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  profile_user_type user_type;
  retry_count INTEGER := 0;
  max_retries CONSTANT INTEGER := 3;
  profile_id uuid;
BEGIN
  -- Add initial delay to ensure auth user is fully created
  PERFORM pg_sleep(0.5);

  -- Validate user metadata exists
  IF NEW.raw_user_meta_data IS NULL THEN
    RAISE WARNING 'Missing user metadata for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Validate required fields
  IF NEW.raw_user_meta_data->>'full_name' IS NULL THEN
    RAISE WARNING 'Missing full_name for user %', NEW.id;
    RETURN NEW;
  END IF;
  
  IF NEW.raw_user_meta_data->>'user_type' IS NULL THEN
    RAISE WARNING 'Missing user_type for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Validate and cast user_type with better error handling
  BEGIN
    profile_user_type := (NEW.raw_user_meta_data->>'user_type')::user_type;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE WARNING 'Invalid user_type for user %: %', NEW.id, NEW.raw_user_meta_data->>'user_type';
      RETURN NEW;
  END;

  -- Retry loop for profile creation
  WHILE retry_count < max_retries LOOP
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
      )
      RETURNING id INTO profile_id;

      -- If we reach here, insertion was successful
      RAISE NOTICE 'Profile created successfully for user % with profile_id %', NEW.id, profile_id;
      RETURN NEW;

    EXCEPTION
      WHEN unique_violation THEN
        -- Handle duplicate email
        RAISE WARNING 'Duplicate email for user %: %', NEW.id, NEW.email;
        RETURN NEW;
      WHEN OTHERS THEN
        -- Log error and retry
        RAISE WARNING 'Attempt % failed to create profile for user %: %', retry_count + 1, NEW.id, SQLERRM;
        retry_count := retry_count + 1;
        IF retry_count < max_retries THEN
          PERFORM pg_sleep(retry_count); -- Exponential backoff
        END IF;
    END;
  END LOOP;

  -- If we reach here, all retries failed
  RAISE WARNING 'Failed to create profile for user % after % attempts', NEW.id, max_retries;
  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();