const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String, // e.g., Electronics, Keys, Clothing, Books
      required: true
    },
    status: {
      type: String,
      enum: ["Lost", "Found"], // Distinguishes between reported lost or found items
      required: true
    },
    location: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    contactEmail: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Item", itemSchema);