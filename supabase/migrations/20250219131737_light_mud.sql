/*
  # Add doctor update permissions

  1. Changes
    - Add policy allowing doctors to update symptom reports
    - Add policy allowing doctors to update their own reports
*/

-- Add policy for doctors to update symptom reports
CREATE POLICY "Doctors can update any pending report"
  ON symptom_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
    AND status = 'pending_review'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
    AND status = 'pending_review'
  );