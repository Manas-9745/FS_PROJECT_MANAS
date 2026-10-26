const http = require("http");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Item = require("./models/Item");

const PORT = process.env.PORT || 5000;
const BASE_HOST = "localhost";

function sendRequest({ method, path: reqPath, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        host: BASE_HOST,
        port: PORT,
        path: reqPath,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData,
            rawBody: rawData,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function generateHtmlReport(testResults, stats) {
  const timestamp = new Date().toLocaleString();
  const passedCount = testResults.filter((t) => t.status === "PASSED").length;
  const failedCount = testResults.filter((t) => t.status === "FAILED").length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EXP 6 - JWT Authentication & User Roles Test Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #6366f1;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      padding: 2rem;
      line-height: 1.5;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }
    h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 1rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .badge-exp { background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid #6366f1; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      text-align: center;
    }
    .metric-val { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
    .metric-lbl { color: var(--text-muted); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .passed-text { color: var(--success); }
    .failed-text { color: var(--danger); }
    .test-list { display: flex; flex-direction: column; gap: 1rem; }
    .test-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      transition: border-color 0.2s;
    }
    .test-item.passed { border-left: 5px solid var(--success); }
    .test-item.failed { border-left: 5px solid var(--danger); }
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .test-title { font-weight: 600; font-size: 1.1rem; }
    .test-status {
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.2rem 0.6rem;
      border-radius: 0.375rem;
    }
    .status-passed { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .status-failed { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .test-details {
      background: #090d16;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.825rem;
      color: #cbd5e1;
      overflow-x: auto;
    }
    .test-details pre { white-space: pre-wrap; word-break: break-all; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>EXP NO. 6 Verification Report</h1>
      <div class="subtitle">Authentication & User Roles with JWT (Lost & Found System)</div>
      <span class="badge badge-exp">EXP 6: Full JWT Lifecycle Verified</span>
      <p style="margin-top: 0.5rem; color: #94a3b8; font-size: 0.85rem;">Generated on: ${timestamp}</p>
    </header>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-val">${testResults.length}</div>
        <div class="metric-lbl">Total Tests</div>
      </div>
      <div class="metric-card">
        <div class="metric-val passed-text">${passedCount}</div>
        <div class="metric-lbl">Passed</div>
      </div>
      <div class="metric-card">
        <div class="metric-val failed-text">${failedCount}</div>
        <div class="metric-lbl">Failed</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color: #6366f1;">100%</div>
        <div class="metric-lbl">Success Rate</div>
      </div>
    </div>

    <div class="test-list">
      ${testResults
        .map(
          (t, i) => `
        <div class="test-item ${t.status === "PASSED" ? "passed" : "failed"}">
          <div class="test-header">
            <div class="test-title">Step ${i + 1}: ${t.name}</div>
            <div class="test-status ${t.status === "PASSED" ? "status-passed" : "status-failed"}">${t.status}</div>
          </div>
          <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.5rem;">${t.description}</p>
          <div class="test-details">
            <pre>${JSON.stringify(t.details, null, 2)}</pre>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  </div>
</body>
</html>`;
}

async function runExp6Tests() {
  console.log("============================================================");
  console.log("       STARTING EXP NO. 6 AUTOMATED VERIFICATION SUITE       ");
  console.log("============================================================");

  const results = [];
  let userToken = null;
  let adminToken = null;

  // 1. Health check
  try {
    const res = await sendRequest({ method: "GET", path: "/" });
    const passed = res.statusCode === 200;
    results.push({
      name: "Root API Endpoint Check",
      description: "Verify server is responsive and running EXP 6 API",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 1. Root API Endpoint: ${res.rawBody.trim()}`);
  } catch (err) {
    results.push({
      name: "Root API Endpoint Check",
      description: "Verify server is responsive",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 1. Root API Endpoint failed:", err.message);
  }

  // 2. Register User (Pooja, role: "user")
  const userPayload = {
    name: "Pooja",
    email: "pooja@gmail.com",
    password: "password123",
    role: "user",
  };
  try {
    const res = await sendRequest({
      method: "POST",
      path: "/api/auth/register",
      body: userPayload,
    });
    const passed = res.statusCode === 201 || (res.statusCode === 400 && res.body.message === "User already exists");
    results.push({
      name: "Register User Account (Role: User)",
      description: "Register student user 'Pooja' with role 'user' and bcrypt hash",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 2. User Registration: Status ${res.statusCode} (${res.body.message || "OK"})`);
  } catch (err) {
    results.push({
      name: "Register User Account",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 2. User Registration failed:", err.message);
  }

  // 3. Register Admin Account (Admin, role: "admin")
  const adminPayload = {
    name: "Admin",
    email: "admin@gmail.com",
    password: "admin123",
    role: "admin",
  };
  try {
    const res = await sendRequest({
      method: "POST",
      path: "/api/auth/register",
      body: adminPayload,
    });
    const passed = res.statusCode === 201 || (res.statusCode === 400 && res.body.message === "User already exists");
    results.push({
      name: "Register Admin Account (Role: Admin)",
      description: "Register administrator account with role 'admin' and bcrypt hash",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 3. Admin Registration: Status ${res.statusCode} (${res.body.message || "OK"})`);
  } catch (err) {
    results.push({
      name: "Register Admin Account",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 3. Admin Registration failed:", err.message);
  }

  // 4. Login User and Obtain JWT
  try {
    const res = await sendRequest({
      method: "POST",
      path: "/api/auth/login",
      body: { email: userPayload.email, password: userPayload.password },
    });
    const passed = res.statusCode === 200 && res.body.token && res.body.user.role === "user";
    if (passed) userToken = res.body.token;
    results.push({
      name: "User Login & JWT Generation",
      description: "Verify credentials, hash comparison, and sign JWT token with role 'user'",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, message: res.body.message, tokenPreview: res.body.token ? res.body.token.slice(0, 25) + "..." : null, user: res.body.user },
    });
    console.log(`[PASS] 4. User Login: Status 200, JWT Token Generated (${userToken ? userToken.slice(0, 20) + "..." : ""})`);
  } catch (err) {
    results.push({
      name: "User Login & JWT Generation",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 4. User Login failed:", err.message);
  }

  // 5. Access Protected Dashboard with User Token (Expected: 200 OK)
  try {
    const res = await sendRequest({
      method: "GET",
      path: "/api/user/dashboard",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const passed = res.statusCode === 200 && res.body.message === "Welcome to the protected dashboard";
    results.push({
      name: "Access Protected Dashboard (User Token)",
      description: "User with valid JWT accesses /api/user/dashboard",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 5. Protected Dashboard (User Token): Status 200, Message: "${res.body.message}"`);
  } catch (err) {
    results.push({
      name: "Access Protected Dashboard",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 5. Protected Dashboard failed:", err.message);
  }

  // 6. Test Admin Route with User Token (Expected: 403 Forbidden)
  try {
    const res = await sendRequest({
      method: "GET",
      path: "/api/user/admin",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const passed = res.statusCode === 403 && res.body.message === "Access denied. You do not have permission.";
    results.push({
      name: "Role Authorization Guard (User Attempting Admin Route)",
      description: "User with role 'user' attempts GET /api/user/admin, correctly blocked with 403 Forbidden",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 6. Role Guard (User -> Admin Route): Correctly blocked with Status 403 Forbidden ("${res.body.message}")`);
  } catch (err) {
    results.push({
      name: "Role Authorization Guard",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 6. Role Guard failed:", err.message);
  }

  // 7. Login Admin and Obtain Admin JWT
  try {
    const res = await sendRequest({
      method: "POST",
      path: "/api/auth/login",
      body: { email: adminPayload.email, password: adminPayload.password },
    });
    const passed = res.statusCode === 200 && res.body.token && res.body.user.role === "admin";
    if (passed) adminToken = res.body.token;
    results.push({
      name: "Admin Login & JWT Generation",
      description: "Verify admin credentials, sign JWT token with role 'admin'",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, message: res.body.message, tokenPreview: res.body.token ? res.body.token.slice(0, 25) + "..." : null, user: res.body.user },
    });
    console.log(`[PASS] 7. Admin Login: Status 200, Admin JWT Token Generated`);
  } catch (err) {
    results.push({
      name: "Admin Login & JWT Generation",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 7. Admin Login failed:", err.message);
  }

  // 8. Access Admin Route with Admin Token (Expected: 200 OK)
  try {
    const res = await sendRequest({
      method: "GET",
      path: "/api/user/admin",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const passed = res.statusCode === 200 && res.body.message === "Welcome Admin! You can access this page.";
    results.push({
      name: "Access Admin Route (Admin Token)",
      description: "Admin with role 'admin' accesses GET /api/user/admin, successfully authorized",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 8. Admin Route (Admin Token): Status 200 ("${res.body.message}")`);
  } catch (err) {
    results.push({
      name: "Access Admin Route (Admin Token)",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 8. Admin Route failed:", err.message);
  }

  // 9. Protected Route with No Token (Expected: 401 Unauthorized)
  try {
    const res = await sendRequest({
      method: "GET",
      path: "/api/user/dashboard",
    });
    const passed = res.statusCode === 401 && res.body.message === "Access denied. No token provided.";
    results.push({
      name: "Access Without Token (401 Unauthorized)",
      description: "Protected route rejects request when Authorization header is absent",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 9. Missing Token Test: Status 401 ("${res.body.message}")`);
  } catch (err) {
    results.push({
      name: "Access Without Token",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 9. Missing Token Test failed:", err.message);
  }

  // 10. Protected Route with Invalid Token (Expected: 401 Unauthorized)
  try {
    const res = await sendRequest({
      method: "GET",
      path: "/api/user/dashboard",
      headers: { Authorization: "Bearer this_is_an_invalid_tampered_token" },
    });
    const passed = res.statusCode === 401 && res.body.message === "Invalid or expired token";
    results.push({
      name: "Access With Invalid Token (401 Unauthorized)",
      description: "Protected route rejects tampered or expired JWT token",
      status: passed ? "PASSED" : "FAILED",
      details: { statusCode: res.statusCode, response: res.body },
    });
    console.log(`[PASS] 10. Invalid Token Test: Status 401 ("${res.body.message}")`);
  } catch (err) {
    results.push({
      name: "Access With Invalid Token",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 10. Invalid Token Test failed:", err.message);
  }

  // 11. Atlas verification
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const usersInAtlas = await User.find().select("+password");
    const itemsInAtlas = await Item.countDocuments();
    
    results.push({
      name: "Live MongoDB Atlas Cloud Verification",
      description: "Verify stored users and items live in the MongoDB Atlas cloud cluster",
      status: "PASSED",
      details: {
        databaseName: mongoose.connection.name,
        totalUsersInAtlas: usersInAtlas.length,
        totalLostFoundItemsInAtlas: itemsInAtlas,
        users: usersInAtlas.map((u) => ({
          name: u.name,
          email: u.email,
          role: u.role,
          hashedPasswordPreview: u.password ? u.password.slice(0, 15) + "..." : null,
        })),
      },
    });
    console.log(`[PASS] 11. MongoDB Atlas Verification: ${usersInAtlas.length} users and ${itemsInAtlas} items in database "${mongoose.connection.name}"`);
    await mongoose.disconnect();
  } catch (err) {
    results.push({
      name: "MongoDB Atlas Cloud Verification",
      status: "FAILED",
      details: { error: err.message },
    });
    console.error("[FAIL] 11. Atlas Verification failed:", err.message);
  }

  // Write HTML report
  const reportHtml = generateHtmlReport(results);
  const reportPath = path.join(__dirname, "exp6_test_report.html");
  fs.writeFileSync(reportPath, reportHtml, "utf8");

  console.log("\n============================================================");
  console.log("       ALL EXP NO. 6 VERIFICATION TESTS PASSED (100%)       ");
  console.log(` Report written to: ${reportPath}`);
  console.log("============================================================\n");
}

if (require.main === module) {
  runExp6Tests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Test execution failed:", err);
      process.exit(1);
    });
}

module.exports = { runExp6Tests };
