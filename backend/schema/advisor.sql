-- ============================================================
-- AI Financial Advisor Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Conversation threads (one per chat session with the advisor)
CREATE TABLE advisor_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Individual messages within a conversation
CREATE TABLE advisor_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text NOT NULL,
  metadata        jsonb,
  tokens_used     int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Links a conversation to the net worth snapshot it was based on (optional)
CREATE TABLE advisor_conversation_context (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  snapshot_id     uuid REFERENCES net_worth_snapshots(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ON advisor_conversations (user_id);
CREATE INDEX ON advisor_messages (conversation_id, created_at);

-- Auto-update updated_at on advisor_conversations
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER advisor_conversations_updated_at
BEFORE UPDATE ON advisor_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: users can only see their own conversations
ALTER TABLE advisor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_conversation_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own conversations" ON advisor_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own messages" ON advisor_messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM advisor_conversations WHERE user_id = auth.uid())
  );

CREATE POLICY "own context" ON advisor_conversation_context
  FOR ALL USING (
    conversation_id IN (SELECT id FROM advisor_conversations WHERE user_id = auth.uid())
  );
