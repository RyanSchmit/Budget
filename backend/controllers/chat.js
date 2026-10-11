const db = require("../config/db");

// ------------------------------------------------------------------
// Helper: verify the requesting user is a participant of a given
// conversation. Returns true/false. Used to gate all message ops.
// ------------------------------------------------------------------
async function isParticipant(conversationId, userId) {
  const row = await db.one(
    `SELECT id FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
  return row !== null;
}

// ------------------------------------------------------------------
// GET /api/chat/conversations
// Lists all conversations the user participates in, ordered by the
// most recently joined first.
// ------------------------------------------------------------------
async function listConversations(req, res, next) {
  try {
    const conversations = await db.rows(
      `SELECT c.id, c.name, c.is_group, c.created_at, p.joined_at
         FROM conversation_participants p
         JOIN conversations c ON c.id = p.conversation_id
        WHERE p.user_id = $1
        ORDER BY p.joined_at DESC`,
      [req.user.id],
    );

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

    // A conversation with no participants is unusable and unreachable,
    // so both inserts have to land together.
    const conversation = await db.transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO conversations (name, is_group) VALUES ($1, $2) RETURNING *`,
        [name, is_group],
      );
      const created = rows[0];

      // Build the participant list — always includes the creator
      const uniqueIds = [...new Set([userId, ...participant_ids])];
      const params = [created.id, ...uniqueIds];
      const tuples = uniqueIds.map((_, i) => `($1, $${i + 2})`).join(", ");

      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
              VALUES ${tuples}`,
        params,
      );

      return created;
    });

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /api/chat/conversations/:conversationId/join
// Adds the user to an existing conversation.
// Silently succeeds if they are already a participant (idempotent).
// ------------------------------------------------------------------
async function joinConversation(req, res, next) {
  try {
    const { conversationId } = req.params;

    // Verify the conversation exists
    const conv = await db.one(`SELECT id FROM conversations WHERE id = $1`, [conversationId]);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // No-op if the user is already a participant
    await db.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
            VALUES ($1, $2)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, req.user.id],
    );

    res.json({ message: "Joined conversation", conversation_id: conversationId });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /api/chat/conversations/:conversationId/messages
// Sends a new message to a conversation. The user must already be a
// participant.
//
// Body: { content: string }
// ------------------------------------------------------------------
async function sendMessage(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "content is required and must be a non-empty string" });
    }
    if (content.length > 4000) {
      return res.status(400).json({ error: "content must be 4000 characters or fewer" });
    }

    // Gate: only participants can send messages
    if (!(await isParticipant(conversationId, req.user.id))) {
      return res.status(403).json({ error: "You are not a participant of this conversation" });
    }

    const message = await db.one(
      `INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)
         RETURNING *`,
      [conversationId, req.user.id, content.trim()],
    );

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
    const { conversationId } = req.params;

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before; // ISO timestamp cursor

    // Gate: only participants can read messages
    if (!(await isParticipant(conversationId, req.user.id))) {
      return res.status(403).json({ error: "You are not a participant of this conversation" });
    }

    const messages = await db.rows(
      `SELECT id, conversation_id, sender_id, content, created_at
         FROM messages
        WHERE conversation_id = $1
          AND deleted_at IS NULL
          AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)
        ORDER BY created_at DESC
        LIMIT $3`,
      [conversationId, before ?? null, limit],
    );

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
    const { messageId } = req.params;

    // Fetch the message to verify ownership
    const message = await db.one(
      `SELECT id, sender_id, deleted_at FROM messages WHERE id = $1`,
      [messageId],
    );

    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.deleted_at !== null) {
      return res.status(410).json({ error: "Message has already been deleted" });
    }
    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    // Perform the soft delete
    await db.query(`UPDATE messages SET deleted_at = now() WHERE id = $1`, [messageId]);

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
