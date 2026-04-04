-- Run this in the Supabase SQL editor.
-- Stores per-user AI feature preference flags (opt-out model: all default TRUE).

CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_ai_data_access    BOOLEAN NOT NULL DEFAULT TRUE,
  allow_ai_categorization BOOLEAN NOT NULL DEFAULT TRUE,
  enable_ai_advisor       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- One row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_preferences_user_id
  ON user_ai_preferences(user_id);

-- Auto-refresh updated_at on every write
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_ai_preferences_updated_at
  BEFORE UPDATE ON user_ai_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row-level security
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON user_ai_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
