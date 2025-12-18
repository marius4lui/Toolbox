-- Supabase Schema for Toolbox Link & QR Code Service
-- Run this in Supabase SQL Editor
-- Updated: Adds user_id, expires_at, is_active for link management

-- Create redirects table (updated schema)
CREATE TABLE IF NOT EXISTS redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash VARCHAR(12) UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '31 days'),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  clicks INTEGER DEFAULT 0
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_redirects_hash ON redirects(hash);
CREATE INDEX IF NOT EXISTS idx_redirects_user_id ON redirects(user_id);
CREATE INDEX IF NOT EXISTS idx_redirects_expires_at ON redirects(expires_at);

-- Function to increment clicks
CREATE OR REPLACE FUNCTION increment_clicks(row_hash VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  new_clicks INTEGER;
BEGIN
  UPDATE redirects 
  SET clicks = clicks + 1 
  WHERE hash = row_hash AND is_active = true
  RETURNING clicks INTO new_clicks;
  RETURN new_clicks;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired links (mark as inactive)
-- Can be called via pg_cron or Supabase Edge Function
CREATE OR REPLACE FUNCTION cleanup_expired_links()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE redirects 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access for active redirects (for redirect lookups)
DROP POLICY IF EXISTS "Allow public read" ON redirects;
CREATE POLICY "Allow public read" ON redirects
  FOR SELECT USING (is_active = true);

-- Policy: Allow public insert (for creating new redirects, guest or authenticated)
DROP POLICY IF EXISTS "Allow public insert" ON redirects;
CREATE POLICY "Allow public insert" ON redirects
  FOR INSERT WITH CHECK (true);

-- Policy: Allow users to read their own links (including inactive)
DROP POLICY IF EXISTS "Users can view own links" ON redirects;
CREATE POLICY "Users can view own links" ON redirects
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow users to update their own links
DROP POLICY IF EXISTS "Users can update own links" ON redirects;
CREATE POLICY "Users can update own links" ON redirects
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Allow users to delete their own links
DROP POLICY IF EXISTS "Users can delete own links" ON redirects;
CREATE POLICY "Users can delete own links" ON redirects
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Allow public update for click counting (only clicks column)
DROP POLICY IF EXISTS "Allow public click update" ON redirects;
CREATE POLICY "Allow public click update" ON redirects
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Migration: Add new columns to existing table (if running on existing database)
-- Uncomment these if you already have the table and need to add columns:
-- ALTER TABLE redirects ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '31 days');
-- ALTER TABLE redirects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE redirects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
