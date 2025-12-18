-- Supabase Schema for Toolbox Redirect Service
-- Run this in Supabase SQL Editor

-- Create redirects table
CREATE TABLE IF NOT EXISTS redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash VARCHAR(12) UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clicks INTEGER DEFAULT 0
);

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_redirects_hash ON redirects(hash);

-- Function to increment clicks
CREATE OR REPLACE FUNCTION increment_clicks(row_hash VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  new_clicks INTEGER;
BEGIN
  UPDATE redirects 
  SET clicks = clicks + 1 
  WHERE hash = row_hash
  RETURNING clicks INTO new_clicks;
  RETURN new_clicks;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access for redirects
CREATE POLICY "Allow public read" ON redirects
  FOR SELECT USING (true);

-- Policy: Allow public insert (for creating new redirects)  
CREATE POLICY "Allow public insert" ON redirects
  FOR INSERT WITH CHECK (true);

-- Policy: Allow public update (for click counting)
CREATE POLICY "Allow public update" ON redirects
  FOR UPDATE USING (true);
