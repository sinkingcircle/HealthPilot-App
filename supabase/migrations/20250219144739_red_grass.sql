/*
  # Lab Documents Schema

  1. New Tables
    - `lab_documents`
      - `id` (uuid, primary key)
      - `lab_id` (uuid, references profiles)
      - `image_url` (text)
      - `analysis` (text)
      - `document_type` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `lab_documents` table
    - Add policies for lab users to manage their documents
*/

-- Create lab_documents table
CREATE TABLE IF NOT EXISTS lab_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  analysis text NOT NULL,
  document_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_lab_user CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = lab_id
      AND user_type = 'lab'
    )
  )
);

-- Enable RLS
ALTER TABLE lab_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Labs can manage their own documents"
  ON lab_documents
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE id = lab_id
      AND user_type = 'lab'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE id = lab_id
      AND user_type = 'lab'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_lab_documents_lab_id ON lab_documents(lab_id);
CREATE INDEX idx_lab_documents_created_at ON lab_documents(created_at);
CREATE INDEX idx_lab_documents_document_type ON lab_documents(document_type);