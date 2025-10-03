-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  token_balance INTEGER DEFAULT 1000 NOT NULL,
  total_tips_received INTEGER DEFAULT 0 NOT NULL,
  recommendation_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curator_address TEXT NOT NULL,
  music_url TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  review TEXT NOT NULL,
  genre TEXT NOT NULL,
  moods TEXT[] NOT NULL DEFAULT '{}',
  tip_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (curator_address) REFERENCES users(address) ON DELETE CASCADE
);

-- Create tips table to track individual tips
CREATE TABLE IF NOT EXISTS tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID NOT NULL,
  tipper_address TEXT NOT NULL,
  curator_address TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
  FOREIGN KEY (tipper_address) REFERENCES users(address) ON DELETE CASCADE,
  FOREIGN KEY (curator_address) REFERENCES users(address) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_address ON users(address);
CREATE INDEX IF NOT EXISTS idx_recommendations_curator ON recommendations(curator_address);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_recommendation ON tips(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_tips_tipper ON tips(tipper_address);
CREATE INDEX IF NOT EXISTS idx_tips_curator ON tips(curator_address);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Anyone can read user profiles
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (true);

-- RLS Policies for recommendations table
-- Anyone can read recommendations
CREATE POLICY "Recommendations are viewable by everyone"
  ON recommendations FOR SELECT
  USING (true);

-- Anyone can insert recommendations (wallet-based auth)
CREATE POLICY "Anyone can create recommendations"
  ON recommendations FOR INSERT
  WITH CHECK (true);

-- Users can update their own recommendations
CREATE POLICY "Users can update their own recommendations"
  ON recommendations FOR UPDATE
  USING (true);

-- Users can delete their own recommendations
CREATE POLICY "Users can delete their own recommendations"
  ON recommendations FOR DELETE
  USING (true);

-- RLS Policies for tips table
-- Anyone can read tips
CREATE POLICY "Tips are viewable by everyone"
  ON tips FOR SELECT
  USING (true);

-- Anyone can insert tips (wallet-based auth)
CREATE POLICY "Anyone can create tips"
  ON tips FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
