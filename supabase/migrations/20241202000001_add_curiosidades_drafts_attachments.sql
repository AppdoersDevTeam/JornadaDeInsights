-- Add status field to curiosidades (draft or published)
ALTER TABLE curiosidades 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Add attachments field to store JSON array of file URLs
ALTER TABLE curiosidades 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_curiosidades_status ON curiosidades(status);

-- Update existing records to be published by default
UPDATE curiosidades SET status = 'published' WHERE status IS NULL;

