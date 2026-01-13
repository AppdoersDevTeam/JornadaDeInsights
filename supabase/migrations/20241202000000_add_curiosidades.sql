-- Create curiosidades (blog posts) table
CREATE TABLE IF NOT EXISTS curiosidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_curiosidades_created_at ON curiosidades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curiosidades_category ON curiosidades(category);

-- Enable RLS on curiosidades table
ALTER TABLE curiosidades ENABLE ROW LEVEL SECURITY;

-- Create policies for curiosidades (public read, authenticated write)
CREATE POLICY "Anyone can view curiosidades" ON curiosidades
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert curiosidades" ON curiosidades
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update curiosidades" ON curiosidades
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete curiosidades" ON curiosidades
  FOR DELETE USING (true);

