-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own ebooks" ON ebooks_metadata;
DROP POLICY IF EXISTS "Users can insert their own ebooks" ON ebooks_metadata;
DROP POLICY IF EXISTS "Users can update their own ebooks" ON ebooks_metadata;
DROP POLICY IF EXISTS "Users can delete their own ebooks" ON ebooks_metadata;

-- Remove the uploaded_by column
ALTER TABLE ebooks_metadata DROP COLUMN uploaded_by;

-- Create new policies without uploaded_by checks
CREATE POLICY "Users can view ebooks" ON ebooks_metadata
  FOR SELECT USING (true);

CREATE POLICY "Users can insert ebooks" ON ebooks_metadata
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update ebooks" ON ebooks_metadata
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete ebooks" ON ebooks_metadata
  FOR DELETE USING (true); 