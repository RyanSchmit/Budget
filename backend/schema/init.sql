-- ============================================================
-- Budget — local PostgreSQL schema
--
--   createdb budget
--   psql -d budget -f schema/init.sql
--
-- This app runs single-user with no authentication, but every
-- table keeps its `user_id` column so data migrated out of the
-- previous hosted setup stays intact. The backend stamps every
-- row with LOCAL_USER_ID (see config/db.js).
-- ============================================================

-- ------------------------------------------------------------
-- Shared trigger: refresh updated_at on every UPDATE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  transact_id  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL,
  date         date        NOT NULL,
  description  text        NOT NULL,
  category     text        NOT NULL,
  amount       numeric     NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- A user cannot have two transactions sharing (date, description,
-- amount). category is intentionally excluded. Doubles as the
-- conflict target for the duplicate-ignoring insert paths.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_user_date_desc_amount
  ON transactions (user_id, date, description, amount);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, date DESC, transact_id);

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- net_worth_snapshots + accounts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL,
  snapshot_date date        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

DROP TRIGGER IF EXISTS net_worth_snapshots_updated_at ON net_worth_snapshots;
CREATE TRIGGER net_worth_snapshots_updated_at
  BEFORE UPDATE ON net_worth_snapshots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS net_worth_snapshot_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id  uuid        NOT NULL REFERENCES net_worth_snapshots(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL,
  account_key  text,
  account_name text        NOT NULL,
  amount       numeric     NOT NULL,
  account_type text        NOT NULL CHECK (account_type IN ('asset', 'liability')),
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshot_accounts_snapshot
  ON net_worth_snapshot_accounts (snapshot_id, sort_order);

-- ------------------------------------------------------------
-- goals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL,
  type                  text        NOT NULL,
  name                  text        NOT NULL,
  target_amount         numeric     NOT NULL,
  current_savings       numeric     NOT NULL DEFAULT 0,
  weekly_contribution   numeric     NOT NULL DEFAULT 0,
  annual_rate           numeric     NOT NULL DEFAULT 5,
  timeline              text        NOT NULL DEFAULT 'flexible',
  duration_years        numeric,
  emergency_months      numeric,
  current_age           numeric,
  retirement_age        numeric,
  desired_annual_income numeric,
  home_price            numeric,
  debt_interest_rate    numeric,
  position              integer,
  auto_transfer_enabled boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_position
  ON goals (user_id, position, created_at);

DROP TRIGGER IF EXISTS goals_updated_at ON goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- category_limits
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_limits (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL,
  category_name text        NOT NULL,
  monthly_limit numeric     NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_name)
);

DROP TRIGGER IF EXISTS category_limits_updated_at ON category_limits;
CREATE TRIGGER category_limits_updated_at
  BEFORE UPDATE ON category_limits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- keyword_rules  (one row per user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS keyword_rules (
  user_id    uuid        PRIMARY KEY,
  rules      jsonb       NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS keyword_rules_updated_at ON keyword_rules;
CREATE TRIGGER keyword_rules_updated_at
  BEFORE UPDATE ON keyword_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- user_ai_preferences  (opt-out model: everything defaults TRUE)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL UNIQUE,
  allow_ai_data_access    boolean     NOT NULL DEFAULT true,
  allow_ai_categorization boolean     NOT NULL DEFAULT true,
  enable_ai_advisor       boolean     NOT NULL DEFAULT true,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS user_ai_preferences_updated_at ON user_ai_preferences;
CREATE TRIGGER user_ai_preferences_updated_at
  BEFORE UPDATE ON user_ai_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- AI advisor: conversations, messages, linked snapshot context
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advisor_conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  title      text,
  status     text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_conversations_user
  ON advisor_conversations (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS advisor_conversations_updated_at ON advisor_conversations;
CREATE TRIGGER advisor_conversations_updated_at
  BEFORE UPDATE ON advisor_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS advisor_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text        NOT NULL,
  metadata        jsonb,
  tokens_used     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_messages_conversation
  ON advisor_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS advisor_conversation_context (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  snapshot_id     uuid        REFERENCES net_worth_snapshots(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_context_conversation
  ON advisor_conversation_context (conversation_id);

-- ------------------------------------------------------------
-- Peer-to-peer chat
--
-- These tables never existed in the hosted database, so there is
-- no data to migrate into them. They are created here so the
-- already-mounted /api/chat routes work instead of erroring.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text,                          -- NULL for DMs, set for groups
  is_group   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user
  ON conversation_participants (user_id, joined_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL,
  content         text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  deleted_at      timestamptz,             -- NULL = live, set = soft-deleted
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);
