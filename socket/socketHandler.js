// Real-Time Socket.IO Communication Gateway for Lost & Found Portal
// Attached to HTTP server on Port 5000.
// Handles JWT authentication, per-item chat rooms, database persistence, and diagnostic ping.

const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const User = require("../models/User");

/**
 * Initialize Socket.IO on the existing http.Server instance.
 * @param {import("http").Server} httpServer
 */
function initSocket(httpServer) {
  const { Server } = require("socket.io");

  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ─────────────────────────────────────────
  // JWT Authentication middleware for Socket.IO
  // The client passes the JWT as socket.handshake.auth.token
  // ─────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_strong_secret_key"
      );
      socket.user = decoded; // { id, role, iat, exp }
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  // ─────────────────────────────────────────
  // Connection handler
  // ─────────────────────────────────────────
  io.on("connection", async (socket) => {
    // Resolve user details from database for clean terminal output
    let userName = "Campus User";
    let userRole = socket.user.role || "user";
    try {
      const userDoc = await User.findById(socket.user.id).select("name email role");
      if (userDoc) {
        userName = userDoc.name;
        userRole = userDoc.role;
      }
    } catch (e) {}

    socket.userName = userName;
    socket.userRole = userRole;

    console.log(
      `\n🟢 [WebSocket:5000] Client Connected -> "${userName}" (${userRole.toUpperCase()}) | Socket ID: ${socket.id}`
    );

    // ── Diagnostic / Status Ping (Port 5000 verification) ──
    socket.on("pingServer", (callback) => {
      console.log(`⚡ [WebSocket:5000] Status Ping received from "${userName}"`);
      if (typeof callback === "function") {
        callback({
          status: "connected",
          port: 5000,
          transport: socket.conn.transport.name,
          protocol: "WebSocket (Socket.IO v4)",
          socketId: socket.id,
          userName: socket.userName,
          userRole: socket.userRole,
          serverTime: new Date().toLocaleTimeString(),
          activeRooms: Array.from(socket.rooms),
          message: "WebSocket Server is LIVE on port 5000 with real-time bidirectional messaging enabled!"
        });
      }
    });

    // ── joinRoom ──────────────────────────
    // Client joins a room tied to a specific Lost/Found item.
    socket.on("joinRoom", async ({ itemId }) => {
      if (!itemId || typeof itemId !== "string") {
        socket.emit("error", { message: "Invalid itemId" });
        return;
      }

      const room = `item:${itemId}`;
      socket.join(room);
      console.log(`📡 [WebSocket:5000] "${userName}" joined chat room [${room}]`);

      // Send persisted message history for this room
      try {
        const history = await Message.find({ roomId: itemId })
          .sort({ createdAt: 1 })
          .limit(100)
          .lean();

        socket.emit("messageHistory", history);
      } catch (err) {
        console.error("[WebSocket:5000] Error fetching history:", err.message);
        socket.emit("error", { message: "Could not load message history" });
      }
    });

    // ── sendMessage ───────────────────────
    socket.on("sendMessage", async ({ itemId, text, senderName }) => {
      // Validation
      if (!itemId || typeof itemId !== "string") {
        socket.emit("error", { message: "Invalid itemId" });
        return;
      }

      if (!text || typeof text !== "string" || text.trim() === "") {
        socket.emit("error", { message: "Message text cannot be empty" });
        return;
      }

      if (text.trim().length > 1000) {
        socket.emit("error", { message: "Message too long (max 1000 chars)" });
        return;
      }

      const room = `item:${itemId}`;

      // Ensure the socket is joined to the item room (seamless & robust)
      if (!socket.rooms.has(room)) {
        socket.join(room);
        console.log(`📡 [WebSocket:5000] Auto-joined "${userName}" to room [${room}]`);
      }

      const sanitizedName =
        typeof senderName === "string" && senderName.trim()
          ? senderName.trim().slice(0, 60)
          : userName;

      try {
        // Persist to MongoDB Atlas
        const saved = await Message.create({
          roomId: itemId,
          senderId: socket.user.id,
          senderName: sanitizedName,
          text: text.trim(),
        });

        const payload = {
          _id: saved._id,
          roomId: saved.roomId,
          senderId: saved.senderId,
          senderName: saved.senderName,
          text: saved.text,
          createdAt: saved.createdAt,
        };

        // Broadcast instantly to ALL sockets in this item room
        io.to(room).emit("receiveMessage", payload);

        console.log(
          `💬 [WebSocket:5000] [${room}] "${sanitizedName}": "${text.trim().slice(0, 80)}"`
        );
      } catch (err) {
        console.error("[WebSocket:5000] Error saving message:", err.message);
        socket.emit("error", { message: "Failed to save message" });
      }
    });

    // ── leaveRoom ─────────────────────────
    socket.on("leaveRoom", ({ itemId }) => {
      if (!itemId) return;
      const room = `item:${itemId}`;
      socket.leave(room);
      console.log(`🚪 [WebSocket:5000] "${userName}" left room [${room}]`);
    });

    // ── disconnect ────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(
        `🔴 [WebSocket:5000] Client Disconnected: "${userName}" | Reason: ${reason}`
      );
    });
  });

  return io;
}

module.exports = { initSocket };
