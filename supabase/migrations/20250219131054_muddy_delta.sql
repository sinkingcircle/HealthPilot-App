/*
  # Add chat functionality for doctor-patient communication

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `doctor_id` (uuid, references profiles)
      - `patient_id` (uuid, references profiles)
      - `content` (text)
      - `sender_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `chat_messages` table
    - Add policies for doctor and patient access
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Doctors and patients can view their chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id IN (doctor_id, patient_id)
    )
  );

CREATE POLICY "Doctors and patients can insert messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = sender_id
    ) AND
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id IN (doctor_id, patient_id)
    )
  );

-- Add indexes
CREATE INDEX idx_chat_messages_doctor_id ON chat_messages(doctor_id);
CREATE INDEX idx_chat_messages_patient_id ON chat_messages(patient_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);