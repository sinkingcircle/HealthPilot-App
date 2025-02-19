/*
  # Create test user and profile trigger

  1. Changes
    - Add trigger for automatic profile creation
    - Create test user with proper UUID handling
  
  2. Security
    - Uses secure password hashing
    - Maintains referential integrity
*/

-- Create a function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'user_type')::user_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert test user if it doesn't exist
DO $$ 
DECLARE
  test_user_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test@example.com'
  ) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      aud,
      role
    )
    VALUES (
      test_user_id,
      '00000000-0000-0000-0000-000000000000',
      'test@example.com',
      '$2a$10$Ql1OhZH.Wqj3W9EMPq1pOuL7V8qvQGQZ6ZD5XDz7yh0T5UwBYc5Vy',
      NOW(),
      '{"full_name": "Test User", "user_type": "patient"}'::jsonb,
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  END IF;
END $$;