/*
  # Add symptom reports and doctor-patient relationships

  1. New Tables
    - `symptom_reports`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `doctor_id` (uuid, references profiles, nullable)
      - `report_content` (text)
      - `chat_history` (jsonb)
      - `status` (enum: pending_review, accepted, rejected)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `doctor_patients`
      - `id` (uuid, primary key)
      - `doctor_id` (uuid, references profiles)
      - `patient_id` (uuid, references profiles)
      - `status` (enum: active, inactive)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for doctors and patients
*/

-- Create status enums
CREATE TYPE report_status AS ENUM ('pending_review', 'accepted', 'rejected');
CREATE TYPE relationship_status AS ENUM ('active', 'inactive');

-- Create symptom_reports table
CREATE TABLE symptom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id),
  report_content text NOT NULL,
  chat_history jsonb NOT NULL,
  status report_status NOT NULL DEFAULT 'pending_review',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create doctor_patients table
CREATE TABLE doctor_patients (
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

-- Create validation functions
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

-- Create triggers for validation
CREATE TRIGGER validate_symptom_reports_doctor
  BEFORE INSERT OR UPDATE ON symptom_reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_doctor();

CREATE TRIGGER validate_doctor_patient_relationship
  BEFORE INSERT OR UPDATE ON doctor_patients
  FOR EACH ROW
  EXECUTE FUNCTION validate_doctor_patient();

-- Policies for symptom_reports
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

-- Policies for doctor_patients
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

-- Add indexes for better performance
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

-- Create trigger for updating timestamp
CREATE TRIGGER update_symptom_reports_updated_at
  BEFORE UPDATE ON symptom_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();