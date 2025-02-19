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
    - Add trigger to validate lab user type
*/

-- Create lab_documents table
CREATE TABLE IF NOT EXISTS lab_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  analysis text NOT NULL,
  document_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create function to validate lab user
CREATE OR REPLACE FUNCTION validate_lab_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.lab_id
    AND user_type = 'lab'
  ) THEN
    RAISE EXCEPTION 'Invalid lab_id: User must be a lab';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lab user validation
CREATE TRIGGER validate_lab_document
  BEFORE INSERT OR UPDATE ON lab_documents
  FOR EACH ROW
  EXECUTE FUNCTION validate_lab_user();

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