-- Add cover_image column to curiosidades table
ALTER TABLE curiosidades 
ADD COLUMN IF NOT EXISTS cover_image TEXT;

