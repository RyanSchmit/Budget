-- ============================================================
-- Transactions duplicate prevention
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================
-- The transactions table already exists; this migration enforces
-- that a user cannot have two transactions with the same
-- (date, description, amount). category is intentionally excluded.

-- Remove existing duplicates, keeping the earliest row per
-- (user_id, date, description, amount). This must run before the
-- unique index is created, otherwise index creation fails.
DELETE FROM transactions a
USING transactions b
WHERE a.user_id = b.user_id
  AND a.date = b.date
  AND a.description = b.description
  AND a.amount = b.amount
  AND a.created_at > b.created_at;

-- Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_user_date_desc_amount
  ON transactions (user_id, date, description, amount);
