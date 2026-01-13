-- Create curiosidades_categories table (separate from ebook categories)
CREATE TABLE IF NOT EXISTS curiosidades_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id column to curiosidades table
ALTER TABLE curiosidades 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES curiosidades_categories(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_curiosidades_category_id ON curiosidades(category_id);
CREATE INDEX IF NOT EXISTS idx_curiosidades_categories_name ON curiosidades_categories(name);

-- Enable RLS on curiosidades_categories table
ALTER TABLE curiosidades_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for curiosidades_categories (public read, authenticated write)
CREATE POLICY "Anyone can view curiosidades_categories" ON curiosidades_categories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert curiosidades_categories" ON curiosidades_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update curiosidades_categories" ON curiosidades_categories
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete curiosidades_categories" ON curiosidades_categories
  FOR DELETE USING (true);

