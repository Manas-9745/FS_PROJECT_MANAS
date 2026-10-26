// EXP 8: REST endpoint for chat messages
// GET /api/messages/:itemId — returns persisted message history for a room

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Message = require("../models/Message");

// GET /api/messages/:itemId
// Protected: requires valid JWT.
// Returns up to 100 most recent messages for the item's chat room.
router.get("/:itemId", protect, async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId || itemId.length < 1) {
      return res.status(400).json({ message: "Invalid itemId" });
    }

    const messages = await Message.find({ roomId: itemId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
});

module.exports = router;
