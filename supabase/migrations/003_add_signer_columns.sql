CREATE TABLE IF NOT EXISTS user_signers (
  address TEXT PRIMARY KEY REFERENCES users(address) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  fid INTEGER,
  signer_uuid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_signers_fid ON user_signers(fid);

CREATE TRIGGER update_user_signers_updated_at
  BEFORE UPDATE ON user_signers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_signers service access"
  ON user_signers
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
