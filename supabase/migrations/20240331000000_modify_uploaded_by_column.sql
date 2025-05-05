-- Modify the uploaded_by column to use TEXT type
ALTER TABLE ebooks_metadata ALTER COLUMN uploaded_by TYPE TEXT;

-- Update the RLS policies to work with TEXT type
ALTER POLICY "Users can view their own ebooks" ON ebooks_metadata
  USING (auth.uid()::text = uploaded_by);

ALTER POLICY "Users can insert their own ebooks" ON ebooks_metadata
  WITH CHECK (auth.uid()::text = uploaded_by);

ALTER POLICY "Users can update their own ebooks" ON ebooks_metadata
  USING (auth.uid()::text = uploaded_by)
  WITH CHECK (auth.uid()::text = uploaded_by);

ALTER POLICY "Users can delete their own ebooks" ON ebooks_metadata
  USING (auth.uid()::text = uploaded_by); 