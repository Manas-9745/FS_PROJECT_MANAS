// EXP 1–7: Existing Express server — unchanged
// EXP 8: Socket.IO attached to the http.Server created below

const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Step 4: Configure Environment Variables
require("dotenv").config({ path: path.join(__dirname, ".env") });

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const itemRoutes = require("./routes/itemRoutes");
const messageRoutes = require("./routes/messageRoutes"); // EXP 8
const errorHandler = require("./middleware/errorMiddleware");
const { initSocket } = require("./socket/socketHandler"); // EXP 8

const app = express();

// Step 5: Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Rate Limiting Middleware (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

// Base API route
app.get("/", (req, res) => {
  res.send("JWT Authentication API is running");
});

// EXP 7: Docker Health & Communication Check
app.get("/api", (req, res) => {
  res.json({
    message: "Backend is running inside Docker!",
    project: "Lost and Found Management System",
    experiment: "EXP 7 - Docker Deployment",
  });
});

// EXP 6: Authentication Routes (/api/auth/register, /api/auth/login)
app.use("/api/auth", authRoutes);

// EXP 6: User & Protected Routes (/api/user/dashboard, /api/user/admin)
app.use("/api/user", userRoutes);

// EXP 5 Compatibility (/api/users/...)
app.use("/api/users", userRoutes);

// Lost & Found Item Routes (Project PS)
app.use("/api/items", itemRoutes);

// EXP 8: Chat Message Routes (/api/messages/:itemId)
app.use("/api/messages", messageRoutes);

// Secure Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// EXP 8: Create http.Server and attach Socket.IO
// (replaces the direct app.listen so Socket.IO can share the same port)
const httpServer = http.createServer(app);
initSocket(httpServer); // attach Socket.IO to the shared HTTP server

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO attached — real-time chat active (EXP 8)`);
  });
}

module.exports = app;
