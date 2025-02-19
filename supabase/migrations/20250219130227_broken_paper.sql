/*
  # Add doctor view policy for symptom reports

  1. Changes
    - Add policy allowing doctors to view pending reports
    
  2. Security
    - Doctors can view all pending reports
    - Only applies to reports with status 'pending_review'
*/

-- Add policy for doctors to view pending reports
CREATE POLICY "Doctors can view pending reports"
  ON symptom_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
    AND status = 'pending_review'
  );