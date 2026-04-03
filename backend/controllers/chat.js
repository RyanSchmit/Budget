const supabase = require("../config/supabase");

// ------------------------------------------------------------------
// Helper: verify the requesting user is a participant of a given
// conversation. Returns true/false. Used to gate all message ops.
// ------------------------------------------------------------------
async function isParticipant(conversationId, userId) {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

// ------------------------------------------------------------------
// GET /api/chat/conversations
// Lists all conversations the authenticated user participates in,
// ordered by the most recently created first.
// ------------------------------------------------------------------
async function listConversations(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("conversation_participants")
      .select(`
        joined_at,
        conversations (
          id,
          name,
          is_group,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) throw error;

    // Flatten the nested join result
    const conversations = data.map((row) => ({
      ...row.conversations,
      joined_at: row.joined_at,
    }));

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /api/chat/conversations
// Creates a new conversation and adds the creator plus any listed
// participant_ids as members. Supports both DMs and group chats.
//
// Body: { name?: string, is_group?: boolean, participant_ids: string[] }
// ------------------------------------------------------------------
async function createConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { name = null, is_group = false, participant_ids = [] } = req.body;

    if (!Array.isArray(participant_ids)) {
      return res.status(400).json({ error: "participant_ids must be an array" });
    }

    // Create the conversation row
    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .insert({ name, is_group })
      .select()
      .single();

    if (convErr) throw convErr;

    // Build the participant list — always includes the creator
    const uniqueIds = [...new Set([userId, ...participant_ids])];
    const participantRows = uniqueIds.map((uid) => ({
      conversation_id: conversation.id,
      user_id: uid,
    }));

    const { error: partErr } = await supabase
      .from("conversation_participants")
      .insert(participantRows);

    if (partErr) throw partErr;

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /api/chat/conversations/:conversationId/join
// Allows the authenticated user to join an existing conversation.
// Silently succeeds if they are already a participant (idempotent).
// ------------------------------------------------------------------
async function joinConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Verify the conversation exists
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr) throw convErr;
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // Upsert — no-op if the user is already a participant
    const { error: partErr } = await supabase
      .from("conversation_participants")
      .upsert(
        { conversation_id: conversationId, user_id: userId },
        { onConflict: "conversation_id,user_id" }
      );

    if (partErr) throw partErr;

    res.json({ message: "Joined conversation", conversation_id: conversationId });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /api/chat/conversations/:conversationId/messages
// Sends a new message to a conversation. The authenticated user must
// already be a participant.
//
// Body: { content: string }
// ------------------------------------------------------------------
async function sendMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "content is required and must be a non-empty string" });
    }
    if (content.length > 4000) {
      return res.status(400).json({ error: "content must be 4000 characters or fewer" });
    }

    // Gate: only participants can send messages
    const member = await isParticipant(conversationId, userId);
    if (!member) {
      return res.status(403).json({ error: "You are not a participant of this conversation" });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// GET /api/chat/conversations/:conversationId/messages
// Returns paginated message history for a conversation in descending
// order (newest first). Excludes soft-deleted messages.
//
// Query params:
//   limit  (default 50, max 100)
//   before (ISO timestamp — fetch messages older than this cursor)
// ------------------------------------------------------------------
async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before; // ISO timestamp cursor

    // Gate: only participants can read messages
    const member = await isParticipant(conversationId, userId);
    if (!member) {
      return res.status(403).json({ error: "You are not a participant of this conversation" });
    }

    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)          // exclude soft-deleted
      .order("created_at", { ascending: false })
      .limit(limit);

    // Cursor-based pagination: fetch messages older than `before`
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // Provide the next cursor for the caller
    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].created_at
        : null;

    res.json({ messages, next_cursor: nextCursor });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// DELETE /api/chat/messages/:messageId
// Soft-deletes a message by setting deleted_at to now(). Only the
// original sender may delete their own message.
// ------------------------------------------------------------------
async function deleteMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Fetch the message to verify ownership
    const { data: message, error: fetchErr } = await supabase
      .from("messages")
      .select("id, sender_id, deleted_at")
      .eq("id", messageId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.deleted_at !== null) {
      return res.status(410).json({ error: "Message has already been deleted" });
    }
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    // Perform the soft delete
    const { error: updateErr } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);

    if (updateErr) throw updateErr;

    res.json({ message: "Message deleted", message_id: messageId });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listConversations,
  createConversation,
  joinConversation,
  sendMessage,
  getMessages,
  deleteMessage,
};
