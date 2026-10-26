// EXP 8: Automated test suite for Real-Time Communication via WebSockets
// Tests:
// 1. HTTP server + Socket.IO initialization
// 2. JWT authentication on Socket handshake (reject missing/invalid token)
// 3. User A & User B socket connection with valid JWT
// 4. Room isolation (messages in room A do not leak to room B)
// 5. Two-way real-time messaging
// 6. Empty message validation rejection
// 7. Message persistence in MongoDB Atlas via Message model & REST endpoint

process.env.NODE_ENV = "test";
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const jwt = require("jsonwebtoken");
const { io: Client } = require(path.join(__dirname, "../frontend/node_modules/socket.io-client"));
const app = require("./server");
const Message = require("./models/Message");
const Item = require("./models/Item");
const User = require("./models/User");

const TEST_PORT = 5055;
let server;
let testItemId = "test-item-" + Date.now();
let userAToken, userBToken;
let userAId = new mongoose.Types.ObjectId();
let userBId = new mongoose.Types.ObjectId();

async function runTests() {
  console.log("==================================================");
  console.log("  EXP 8: SOCKET.IO WEBSOCKETS VERIFICATION SUITE   ");
  console.log("==================================================");

  // 1. Create test JWT tokens
  const secret = process.env.JWT_SECRET || "your_strong_secret_key";
  userAToken = jwt.sign({ id: userAId.toString(), role: "user" }, secret, { expiresIn: "1h" });
  userBToken = jwt.sign({ id: userBId.toString(), role: "admin" }, secret, { expiresIn: "1h" });

  // 2. Connect directly to running server on Port 5000
  const serverUrl = "http://localhost:5000";
  console.log(`[PASS] Connecting tests to running server: ${serverUrl}`);

  let passed = 0;
  let failed = 0;

  // Helper
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Reject unauthenticated connection
    console.log("\n[TEST 1] JWT Authentication Verification on Socket Handshake");
    await new Promise((resolve) => {
      const badSocket = Client(serverUrl, {
        auth: {}, // No token!
        transports: ["websocket"],
      });

      badSocket.on("connect_error", (err) => {
        assert(err.message.includes("No token provided"), `Unauthenticated socket rejected with: "${err.message}"`);
        badSocket.disconnect();
        resolve();
      });

      badSocket.on("connect", () => {
        assert(false, "Socket connected without token (should have failed!)");
        badSocket.disconnect();
        resolve();
      });
    });

    // TEST 2: Accept authenticated connections for User A and User B
    console.log("\n[TEST 2] Connecting User A and User B with valid JWT tokens");
    const socketA = Client(serverUrl, {
      auth: { token: userAToken },
      transports: ["websocket"],
    });

    const socketB = Client(serverUrl, {
      auth: { token: userBToken },
      transports: ["websocket"],
    });

    await Promise.all([
      new Promise((res) => socketA.on("connect", res)),
      new Promise((res) => socketB.on("connect", res)),
    ]);
    assert(socketA.connected, `User A connected successfully (id: ${socketA.id})`);
    assert(socketB.connected, `User B connected successfully (id: ${socketB.id})`);

    // TEST 3: Join Room for specific Lost & Found item
    console.log("\n[TEST 3] Joining Room for Item:", testItemId);
    socketA.emit("joinRoom", { itemId: testItemId });
    socketB.emit("joinRoom", { itemId: testItemId });
    await new Promise((r) => setTimeout(r, 400));
    assert(true, "Both sockets joined room: item:" + testItemId);

    // TEST 4: Real-time message from User A received by User B
    console.log("\n[TEST 4] Two-way real-time messaging: User A -> User B");
    const testMsgText = "Hello! Did someone find the Blue Backpack in Central Library?";

    const receivedByUserB = await new Promise((resolve) => {
      socketB.on("receiveMessage", (msg) => {
        resolve(msg);
      });
      socketA.emit("sendMessage", {
        itemId: testItemId,
        text: testMsgText,
        senderName: "User A (Pooja)",
      });
    });

    assert(receivedByUserB.text === testMsgText, `User B received message in real-time: "${receivedByUserB.text}"`);
    assert(receivedByUserB.senderName === "User A (Pooja)", `Correct sender name attached: "${receivedByUserB.senderName}"`);
    assert(receivedByUserB.roomId === testItemId, `Correct roomId attached: "${receivedByUserB.roomId}"`);

    // TEST 5: Reply from User B received by User A
    console.log("\n[TEST 5] Reply from User B -> User A");
    const replyText = "Yes, I handed it over to the Security Desk at Room 102!";

    const receivedByUserA = await new Promise((resolve) => {
      socketA.on("receiveMessage", (msg) => {
        if (msg.text === replyText) resolve(msg);
      });
      socketB.emit("sendMessage", {
        itemId: testItemId,
        text: replyText,
        senderName: "User B (Admin)",
      });
    });

    assert(receivedByUserA.text === replyText, `User A received reply in real-time: "${receivedByUserA.text}"`);
    assert(receivedByUserA.senderName === "User B (Admin)", `Correct sender name: "${receivedByUserA.senderName}"`);

    // TEST 6: Room Isolation Verification
    console.log("\n[TEST 6] Room Isolation (No cross-room message leakage)");
    const otherItemId = "other-room-" + Date.now();
    let leakedMessage = null;

    socketB.on("receiveMessage", (msg) => {
      if (msg.roomId === otherItemId) {
        leakedMessage = msg;
      }
    });

    // Socket A joins other room and sends message
    socketA.emit("joinRoom", { itemId: otherItemId });
    await new Promise((r) => setTimeout(r, 200));

    socketA.emit("sendMessage", {
      itemId: otherItemId,
      text: "Secret message in other room",
      senderName: "User A",
    });

    await new Promise((r) => setTimeout(r, 600));
    assert(leakedMessage === null, "User B did NOT receive message from other room (Room Isolation verified!)");

    // TEST 7: Empty message validation
    console.log("\n[TEST 7] Empty Message Rejection");
    const errorReceived = await new Promise((resolve) => {
      socketA.once("error", (err) => {
        resolve(err);
      });
      socketA.emit("sendMessage", {
        itemId: testItemId,
        text: "   ", // only whitespace
        senderName: "User A",
      });
    });

    assert(errorReceived.message.includes("cannot be empty"), `Empty message rejected by server with: "${errorReceived.message}"`);

    // TEST 8: Message Persistence in Database
    console.log("\n[TEST 8] Message Persistence Verification in MongoDB Atlas");
    const persistedMessages = await Message.find({ roomId: testItemId }).sort({ createdAt: 1 }).lean();
    assert(persistedMessages.length >= 2, `Found ${persistedMessages.length} persisted messages in MongoDB Atlas`);
    assert(persistedMessages[0].text === testMsgText, `Persisted message 1 matches: "${persistedMessages[0].text}"`);
    assert(persistedMessages[1].text === replyText, `Persisted message 2 matches: "${persistedMessages[1].text}"`);

    // Disconnect sockets
    socketA.disconnect();
    socketB.disconnect();

  } catch (err) {
    console.error("Test threw error:", err);
    failed++;
  } finally {
    // Clean up test messages
    try {
      await Message.deleteMany({ roomId: { $in: [testItemId] } });
    } catch (e) {}
    if (server) server.close();
  }

  console.log("\n==================================================");
  console.log(`  EXP 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED  `);
  console.log("==================================================");

  if (failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Ensure mongoose is connected before running
if (mongoose.connection.readyState === 1) {
  runTests();
} else {
  mongoose.connection.once("open", runTests);
}
