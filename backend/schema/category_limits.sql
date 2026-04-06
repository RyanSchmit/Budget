-- ============================================================
-- Category Limits Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE category_limits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name  text NOT NULL,
  monthly_limit  numeric NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_name)
);

-- RLS: users can only see and modify their own category limits
ALTER TABLE category_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own category_limits" ON category_limits
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast per-user lookups
CREATE INDEX ON category_limits (user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_category_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_limits_updated_at
BEFORE UPDATE ON category_limits
FOR EACH ROW EXECUTE FUNCTION update_category_limits_updated_at();
