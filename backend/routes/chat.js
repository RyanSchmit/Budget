const express = require("express");
const router = express.Router();
const {
  listConversations,
  createConversation,
  joinConversation,
  sendMessage,
  getMessages,
  deleteMessage,
} = require("../controllers/chat");

// List all conversations for the authenticated user
router.get("/conversations", listConversations);

// Create a new conversation (DM or group)
router.post("/conversations", createConversation);

// Join an existing conversation
router.post("/conversations/:conversationId/join", joinConversation);

// Send a message to a conversation
router.post("/conversations/:conversationId/messages", sendMessage);

// Fetch paginated message history for a conversation
router.get("/conversations/:conversationId/messages", getMessages);

// Soft-delete a message (sender only)
router.delete("/messages/:messageId", deleteMessage);

module.exports = router;
