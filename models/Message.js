const mongoose = require("mongoose");

// EXP 8: Message model for real-time chat persistence
const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String, // itemId used as the chat room identifier
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Message", messageSchema);
