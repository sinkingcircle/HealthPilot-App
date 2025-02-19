/*
  # Fix symptom reports and doctor-patient relationships

  1. Changes
    - Drop existing policies before recreating them
    - Ensure all tables and types exist
    - Add proper indexes and triggers
    
  2. Security
    - Recreate all RLS policies with proper access control
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop symptom_reports policies
  DROP POLICY IF EXISTS "Patients can view their own reports" ON symptom_reports;
  DROP POLICY IF EXISTS "Patients can create their own reports" ON symptom_reports;
  DROP POLICY IF EXISTS "Doctors can update reports they're assigned to" ON symptom_reports;
  
  -- Drop doctor_patients policies
  DROP POLICY IF EXISTS "Doctors can view their patient relationships" ON doctor_patients;
  DROP POLICY IF EXISTS "Doctors can create patient relationships" ON doctor_patients;
  DROP POLICY IF EXISTS "Doctors can update their patient relationships" ON doctor_patients;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create status enums if they don't exist
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending_review', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS symptom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id),
  report_content text NOT NULL,
  chat_history jsonb NOT NULL,
  status report_status NOT NULL DEFAULT 'pending_review',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status relationship_status NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_doctor_patient UNIQUE (doctor_id, patient_id)
);

-- Enable RLS
ALTER TABLE symptom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patients ENABLE ROW LEVEL SECURITY;

-- Create validation functions if they don't exist
CREATE OR REPLACE FUNCTION validate_doctor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.doctor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.doctor_id 
    AND user_type = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Invalid doctor_id: User must be a doctor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_doctor_patient()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.doctor_id 
    AND user_type = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Invalid doctor_id: User must be a doctor';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.patient_id 
    AND user_type = 'patient'
  ) THEN
    RAISE EXCEPTION 'Invalid patient_id: User must be a patient';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace triggers
DROP TRIGGER IF EXISTS validate_symptom_reports_doctor ON symptom_reports;
CREATE TRIGGER validate_symptom_reports_doctor
  BEFORE INSERT OR UPDATE ON symptom_reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_doctor();

DROP TRIGGER IF EXISTS validate_doctor_patient_relationship ON doctor_patients;
CREATE TRIGGER validate_doctor_patient_relationship
  BEFORE INSERT OR UPDATE ON doctor_patients
  FOR EACH ROW
  EXECUTE FUNCTION validate_doctor_patient();

-- Create new policies for symptom_reports
CREATE POLICY "Patients can view their own reports"
  ON symptom_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = patient_id
    ) OR
    auth.uid() IN (
      SELECT p.user_id 
      FROM profiles p
      INNER JOIN doctor_patients dp ON dp.doctor_id = p.id
      WHERE dp.patient_id = symptom_reports.patient_id
      AND dp.status = 'active'
    )
  );

CREATE POLICY "Patients can create their own reports"
  ON symptom_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = patient_id
    )
  );

CREATE POLICY "Doctors can update reports they're assigned to"
  ON symptom_reports
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = doctor_id
    ) OR
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND user_type = 'doctor'
      ) AND
      doctor_id IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = doctor_id
    ) OR
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND user_type = 'doctor'
      ) AND
      doctor_id IS NULL
    )
  );

-- Create new policies for doctor_patients
CREATE POLICY "Doctors can view their patient relationships"
  ON doctor_patients
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = doctor_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = patient_id
    )
  );

CREATE POLICY "Doctors can create patient relationships"
  ON doctor_patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = doctor_id
    ) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND user_type = 'doctor'
    )
  );

CREATE POLICY "Doctors can update their patient relationships"
  ON doctor_patients
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = doctor_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = doctor_id
    )
  );

-- Create or replace indexes
DROP INDEX IF EXISTS idx_symptom_reports_patient_id;
DROP INDEX IF EXISTS idx_symptom_reports_doctor_id;
DROP INDEX IF EXISTS idx_symptom_reports_status;
DROP INDEX IF EXISTS idx_doctor_patients_doctor_id;
DROP INDEX IF EXISTS idx_doctor_patients_patient_id;
DROP INDEX IF EXISTS idx_doctor_patients_status;

CREATE INDEX idx_symptom_reports_patient_id ON symptom_reports(patient_id);
CREATE INDEX idx_symptom_reports_doctor_id ON symptom_reports(doctor_id);
CREATE INDEX idx_symptom_reports_status ON symptom_reports(status);
CREATE INDEX idx_doctor_patients_doctor_id ON doctor_patients(doctor_id);
CREATE INDEX idx_doctor_patients_patient_id ON doctor_patients(patient_id);
CREATE INDEX idx_doctor_patients_status ON doctor_patients(status);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace trigger for updating timestamp
DROP TRIGGER IF EXISTS update_symptom_reports_updated_at ON symptom_reports;
CREATE TRIGGER update_symptom_reports_updated_at
  BEFORE UPDATE ON symptom_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();