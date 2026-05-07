-- ============================================================
-- Goals Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE goals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                  text NOT NULL,
  name                  text NOT NULL,
  target_amount         numeric NOT NULL,
  current_savings       numeric NOT NULL DEFAULT 0,
  weekly_contribution   numeric NOT NULL DEFAULT 0,
  annual_rate           numeric NOT NULL DEFAULT 5,
  timeline              text NOT NULL DEFAULT 'flexible',
  duration_years        numeric,
  emergency_months      numeric,
  current_age           numeric,
  retirement_age        numeric,
  desired_annual_income numeric,
  home_price            numeric,
  debt_interest_rate    numeric,
  position              integer,
  auto_transfer_enabled boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Migration: add position column (run if table already exists)
-- ============================================================
-- ALTER TABLE goals ADD COLUMN IF NOT EXISTS position integer;
-- UPDATE goals g
-- SET position = sub.rn - 1
-- FROM (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
--   FROM goals
-- ) sub
-- WHERE g.id = sub.id;

-- ============================================================
-- Migration: add auto_transfer_enabled column (run if table already exists)
-- ============================================================
-- ALTER TABLE goals ADD COLUMN IF NOT EXISTS auto_transfer_enabled boolean NOT NULL DEFAULT false;

-- RLS: users can only see and modify their own goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast per-user lookups
CREATE INDEX ON goals (user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION update_goals_updated_at();
