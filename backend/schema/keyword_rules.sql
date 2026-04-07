-- ============================================================
-- Keyword Rules Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE keyword_rules (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rules       jsonb NOT NULL DEFAULT '[]',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can only see and modify their own rules
ALTER TABLE keyword_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own keyword_rules" ON keyword_rules
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_keyword_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER keyword_rules_updated_at
BEFORE UPDATE ON keyword_rules
FOR EACH ROW EXECUTE FUNCTION update_keyword_rules_updated_at();
