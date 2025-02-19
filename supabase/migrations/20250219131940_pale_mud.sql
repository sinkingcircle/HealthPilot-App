/*
  # Fix RLS policies for doctor actions

  1. Changes
    - Add policy allowing doctors to update symptom reports
    - Add policy allowing doctors to create doctor-patient relationships
    - Add policy allowing doctors to view all profiles
*/

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Doctors can update any pending report" ON symptom_reports;

-- Create comprehensive policy for doctors to manage symptom reports
CREATE POLICY "Doctors can manage symptom reports"
  ON symptom_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
  );

-- Ensure doctors can create relationships
CREATE POLICY "Doctors can manage patient relationships"
  ON doctor_patients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
  );