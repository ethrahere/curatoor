-- Add Farcaster fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS farcaster_username TEXT,
ADD COLUMN IF NOT EXISTS farcaster_display_name TEXT,
ADD COLUMN IF NOT EXISTS farcaster_fid INTEGER,
ADD COLUMN IF NOT EXISTS farcaster_pfp_url TEXT;

-- Create index for farcaster_fid for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_farcaster_fid ON users(farcaster_fid);
