-- ============================================================
-- Real-Time Chat Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ----------------------------------------------------------
-- 1. conversations
--    Represents a chat room — either a 1-on-1 DM or a group.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text,                             -- NULL for DMs; string for groups
  is_group   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 2. conversation_participants
--    Join table that maps users ↔ conversations.
--    A user must be a participant to read or write messages.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_participants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL,  -- references auth.users(id)
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user
  ON conversation_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation
  ON conversation_participants (conversation_id);

-- ----------------------------------------------------------
-- 3. messages
--    Individual chat messages. deleted_at IS NULL means live;
--    setting deleted_at performs a soft delete.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL,  -- references auth.users(id)
  content         text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  deleted_at      timestamptz,           -- NULL = not deleted (soft delete)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages (sender_id);

-- ============================================================
-- Row Level Security (RLS)
-- NOTE: The backend uses the service_role key, which bypasses
-- RLS. These policies protect direct client-side/anon access
-- and are still best practice to have enabled.
-- ============================================================

ALTER TABLE conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                   ENABLE ROW LEVEL SECURITY;

-- ---- conversations ----

-- Allow a user to see any conversation they participate in
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- Only participants can insert new conversations (handled via backend)
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ---- conversation_participants ----

-- A user can see participant rows for conversations they belong to
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

-- Users can only add themselves as a participant
CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ---- messages ----

-- Users can only read messages in conversations they participate in
CREATE POLICY "Users can read messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Users can only send messages to conversations they participate in
CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Users can only soft-delete their own messages
CREATE POLICY "Users can soft-delete their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ============================================================
-- Realtime: enable the messages table for broadcast
-- Run this ONCE in the Supabase SQL editor.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
