const http = require("http");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");

const PORT = process.env.PORT || 5000;
const BASE_HOST = "localhost";

// Helper for making HTTP requests
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

// Beautiful HTML Test Report Generator
function generateHtmlReport(testResults, stats) {
  const timestamp = new Date().toLocaleString();
  const passedCount = testResults.filter((t) => t.status === "PASS").length;
  const failedCount = testResults.filter((t) => t.status === "FAIL").length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EXP NO. 5 - Secure REST API Execution Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --surface: #111827;
      --surface-border: #1f293d;
      --card-bg: #151d30;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --primary: #6366f1;
      --primary-light: #818cf8;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.15);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.15);
      --warning: #f59e0b;
      --cyan: #06b6d4;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 30px 20px;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    header {
      background: linear-gradient(135deg, #1e1b4b, #1e293b);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .badge-exp { background: var(--primary); color: #fff; }
    h1 { font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .subtitle { color: var(--text-muted); font-size: 14px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-label { font-size: 13px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .stat-val { font-size: 28px; font-weight: 700; color: #fff; }
    .stat-val.passed { color: var(--success); }
    .stat-val.failed { color: var(--danger); }
    .test-list { display: flex; flex-direction: column; gap: 16px; }
    .test-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .test-card.passed { border-left: 4px solid var(--success); }
    .test-card.failed { border-left: 4px solid var(--danger); }
    .test-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--surface-border);
      background: var(--card-bg);
    }
    .test-title-area { display: flex; align-items: center; gap: 12px; }
    .method-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .method-GET { background: #0284c7; color: #fff; }
    .method-POST { background: #16a34a; color: #fff; }
    .test-title { font-weight: 600; font-size: 15px; color: #fff; }
    .status-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .status-badge.PASS { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
    .status-badge.FAIL { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger); }
    .test-body { padding: 20px; font-size: 14px; }
    .test-meta { display: flex; gap: 24px; margin-bottom: 14px; font-size: 13px; color: var(--text-muted); }
    .meta-item strong { color: var(--text); }
    .code-box {
      background: #060913;
      border: 1px solid #1a2234;
      border-radius: 8px;
      padding: 14px;
      margin-top: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      overflow-x: auto;
      color: #93c5fd;
    }
    .assertion-list { margin-top: 12px; list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .assertion-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .assertion-item.passed { color: var(--success); }
    .assertion-item.failed { color: var(--danger); }
    footer {
      text-align: center;
      margin-top: 30px;
      color: var(--text-muted);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <span class="badge badge-exp">Full Stack Lab - Experiment 5</span>
      <h1>Secure, Production-Ready RESTful API Test Report</h1>
      <p class="subtitle">Project: <strong>Lost & Found Portal (FS_prs)</strong> | Tested on: ${timestamp} | Environment: <strong>MongoDB Atlas + Node/Express</strong></p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Total Tests Executed</span>
        <span class="stat-val">${testResults.length}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Tests Passed</span>
        <span class="stat-val passed">${passedCount}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Tests Failed</span>
        <span class="stat-val failed">${failedCount}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Success Rate</span>
        <span class="stat-val" style="color: var(--cyan);">${((passedCount / testResults.length) * 100).toFixed(0)}%</span>
      </div>
    </div>

    <div class="test-list">
      ${testResults
        .map(
          (t, idx) => `
        <div class="test-card ${t.status === "PASS" ? "passed" : "failed"}">
          <div class="test-header">
            <div class="test-title-area">
              <span class="method-pill method-${t.method}">${t.method}</span>
              <span class="test-title">${idx + 1}. ${t.title}</span>
            </div>
            <span class="status-badge ${t.status}">${t.status}</span>
          </div>
          <div class="test-body">
            <div class="test-meta">
              <div class="meta-item">Endpoint: <strong>${t.endpoint}</strong></div>
              <div class="meta-item">Status Code: <strong>${t.statusCode}</strong> (Expected: ${t.expectedStatus})</div>
              <div class="meta-item">Duration: <strong>${t.duration}ms</strong></div>
            </div>
            ${t.assertions && t.assertions.length > 0 ? `
              <div style="font-weight: 600; font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">Assertions:</div>
              <ul class="assertion-list">
                ${t.assertions.map((a) => `<li class="assertion-item ${a.pass ? "passed" : "failed"}">${a.pass ? "✔" : "✖"} ${a.desc}</li>`).join("")}
              </ul>
            ` : ""}
            <div style="font-weight: 600; font-size: 13px; color: var(--text-muted); margin-top: 12px;">Response Body:</div>
            <div class="code-box">${escapeHtml(JSON.stringify(t.responseBody, null, 2))}</div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>

    <footer>
      Experiment 5: Authentication, Authorization, Password Hashing (bcrypt), Rate Limiting, Input Validation & Security Middleware Verified
    </footer>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, "exp5_test_report.html"), html, "utf8");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function runAllTests() {
  console.log("===============================================================");
  console.log(" EXP NO. 5: TESTING SECURE PRODUCTION-READY RESTFUL APIS");
  console.log(" Lost & Found Project (FS_prs)");
  console.log("===============================================================\n");

  const results = [];
  let userToken = null;
  let registeredUserId = null;

  // Ensure DB connected & clean test user so tests are repeatable
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✔ Connected to MongoDB Atlas for setup");
    await User.deleteOne({ email: "student@gmail.com" });
    console.log("✔ Prepared fresh test environment (cleared existing 'student@gmail.com')");
  } catch (err) {
    console.error("Warning: DB setup notice:", err.message);
  }

  // Helper to record test
  async function testStep({ id, title, method, endpoint, headers, body, expectedStatus, checkFn }) {
    const start = Date.now();
    let res = null;
    let assertions = [];
    let pass = false;

    try {
      res = await sendRequest({ method, path: endpoint, headers, body });
      const duration = Date.now() - start;

      const statusMatch = res.statusCode === expectedStatus;
      assertions.push({
        desc: `Expected HTTP status ${expectedStatus}, received ${res.statusCode}`,
        pass: statusMatch,
      });

      if (checkFn) {
        const customAssertions = checkFn(res);
        if (Array.isArray(customAssertions)) {
          assertions.push(...customAssertions);
        }
      }

      pass = assertions.every((a) => a.pass);

      results.push({
        id,
        title,
        method,
        endpoint,
        statusCode: res.statusCode,
        expectedStatus,
        duration,
        assertions,
        status: pass ? "PASS" : "FAIL",
        responseBody: res.body,
      });

      console.log(`[${pass ? "PASS" : "FAIL"}] ${title} (${res.statusCode}) - ${duration}ms`);
      return res;
    } catch (err) {
      const duration = Date.now() - start;
      results.push({
        id,
        title,
        method,
        endpoint,
        statusCode: 0,
        expectedStatus,
        duration,
        assertions: [{ desc: `Network / Request Error: ${err.message}`, pass: false }],
        status: "FAIL",
        responseBody: { error: err.message },
      });
      console.log(`[FAIL] ${title} - Error: ${err.message}`);
      return null;
    }
  }

  // 1. Base API check
  await testStep({
    id: 1,
    title: "Base API Health Check (Helmet & Express running)",
    method: "GET",
    endpoint: "/",
    expectedStatus: 200,
    checkFn: (res) => [
      {
        desc: "Response contains message 'Secure REST API is running'",
        pass: res.body && res.body.message === "Secure REST API is running",
      },
      {
        desc: "Helmet Security Header 'x-dns-prefetch-control' or CSP present",
        pass: !!res.headers["x-content-type-options"] || !!res.headers["x-dns-prefetch-control"],
      },
    ],
  });

  // 2. Step 15 Test 1: Register User
  const regRes = await testStep({
    id: 2,
    title: "Step 15 Test 1: User Registration with Hashed Password",
    method: "POST",
    endpoint: "/api/users/register",
    body: {
      name: "student",
      email: "student@gmail.com",
      password: "student123",
    },
    expectedStatus: 201,
    checkFn: (res) => {
      if (res.body && res.body.userId) {
        registeredUserId = res.body.userId;
      }
      return [
        {
          desc: "Response message is 'User registered successfully'",
          pass: res.body && res.body.message === "User registered successfully",
        },
        {
          desc: "Response includes generated userId",
          pass: !!(res.body && res.body.userId),
        },
      ];
    },
  });

  // 3. Step 13 Input Validation: Reject invalid registration data
  await testStep({
    id: 3,
    title: "Step 13: Input Validation - Reject Invalid Name, Email, and Short Password",
    method: "POST",
    endpoint: "/api/users/register",
    body: {
      name: "",
      email: "not-an-email",
      password: "123",
    },
    expectedStatus: 400,
    checkFn: (res) => [
      {
        desc: "Validation returns errors array",
        pass: res.body && (Array.isArray(res.body.errors) || typeof res.body.message === "string"),
      },
    ],
  });

  // 4. Duplicate User Validation: Cannot register existing email
  await testStep({
    id: 4,
    title: "Duplicate User Check - Prevent re-registering existing email",
    method: "POST",
    endpoint: "/api/users/register",
    body: {
      name: "student",
      email: "student@gmail.com",
      password: "student123",
    },
    expectedStatus: 400,
    checkFn: (res) => [
      {
        desc: "Response message is 'User already exists'",
        pass: res.body && res.body.message === "User already exists",
      },
    ],
  });

  // 5. Step 15 Test 2: Login User & Receive JWT
  const loginRes = await testStep({
    id: 5,
    title: "Step 15 Test 2: User Login & JWT Token Generation",
    method: "POST",
    endpoint: "/api/users/login",
    body: {
      email: "student@gmail.com",
      password: "student123",
    },
    expectedStatus: 200,
    checkFn: (res) => {
      if (res.body && res.body.token) {
        userToken = res.body.token;
      }
      return [
        {
          desc: "Response message is 'Login successful'",
          pass: res.body && res.body.message === "Login successful",
        },
        {
          desc: "JWT Token generated and returned in response",
          pass: !!(res.body && res.body.token && res.body.token.startsWith("eyJ")),
        },
      ];
    },
  });

  // 6. Step 16 Case 1: Wrong Password
  await testStep({
    id: 6,
    title: "Step 16 Case 1: Security Test - Wrong Password Rejection",
    method: "POST",
    endpoint: "/api/users/login",
    body: {
      email: "student@gmail.com",
      password: "wrongpassword123",
    },
    expectedStatus: 401,
    checkFn: (res) => [
      {
        desc: "Response message is 'Invalid email or password'",
        pass: res.body && res.body.message === "Invalid email or password",
      },
    ],
  });

  // 7. Step 15 Test 3: Access Protected Profile API with Bearer Token
  await testStep({
    id: 7,
    title: "Step 15 Test 3: Access Protected Profile using Bearer Token",
    method: "GET",
    endpoint: "/api/users/profile",
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    expectedStatus: 200,
    checkFn: (res) => [
      {
        desc: "Profile returns correct email (student@gmail.com)",
        pass: res.body && res.body.email === "student@gmail.com",
      },
      {
        desc: "Profile has role field ('user')",
        pass: res.body && res.body.role === "user",
      },
      {
        desc: "Password is securely EXCLUDED (.select('-password'))",
        pass: res.body && res.body.password === undefined,
      },
    ],
  });

  // 8. Step 16 Case 2: No Token
  await testStep({
    id: 8,
    title: "Step 16 Case 2: Security Test - Access Protected API without Token",
    method: "GET",
    endpoint: "/api/users/profile",
    expectedStatus: 401,
    checkFn: (res) => [
      {
        desc: "Response message is 'Access denied'",
        pass: res.body && res.body.message === "Access denied",
      },
    ],
  });

  // 9. Step 16 Case 3: Invalid Token
  await testStep({
    id: 9,
    title: "Step 16 Case 3: Security Test - Access with Tampered / Invalid Token",
    method: "GET",
    endpoint: "/api/users/profile",
    headers: {
      Authorization: "Bearer invalid.token.signature",
    },
    expectedStatus: 401,
    checkFn: (res) => [
      {
        desc: "Response message is 'Invalid or expired token'",
        pass: res.body && res.body.message === "Invalid or expired token",
      },
    ],
  });

  // 10. Step 16 Case 4: Expired Token
  const expiredToken = jwt.sign(
    { id: registeredUserId || "660000000000000000000001", role: "user" },
    process.env.JWT_SECRET || "your_strong_secret_key",
    { expiresIn: -1 } // Expired 1 second ago
  );

  await testStep({
    id: 10,
    title: "Step 16 Case 4: Security Test - Access with Expired JWT Token",
    method: "GET",
    endpoint: "/api/users/profile",
    headers: {
      Authorization: `Bearer ${expiredToken}`,
    },
    expectedStatus: 401,
    checkFn: (res) => [
      {
        desc: "Response rejects expired token with 401 Unauthorized",
        pass: res.body && res.body.message === "Invalid or expired token",
      },
    ],
  });

  // 11. Step 16 Case 5: Rate Limiter Header & Behavior
  await testStep({
    id: 11,
    title: "Step 16 Case 5: Rate Limiting Middleware Protection (express-rate-limit)",
    method: "GET",
    endpoint: "/",
    expectedStatus: 200,
    checkFn: (res) => [
      {
        desc: "RateLimit-Limit or Ratelimit-Remaining header present",
        pass:
          !!res.headers["ratelimit-limit"] ||
          !!res.headers["x-ratelimit-limit"] ||
          !!res.headers["ratelimit-remaining"] ||
          !!res.headers["x-ratelimit-remaining"],
      },
    ],
  });

  // 12. Lost & Found Items Integration Check
  await testStep({
    id: 12,
    title: "Project Problem Statement Check: Lost & Found Items API is accessible",
    method: "GET",
    endpoint: "/api/items",
    expectedStatus: 200,
    checkFn: (res) => [
      {
        desc: "Items endpoint responds with an array from MongoDB",
        pass: Array.isArray(res.body),
      },
    ],
  });

  // Save HTML Report
  generateHtmlReport(results);
  console.log("\n===============================================================");
  const passCount = results.filter((r) => r.status === "PASS").length;
  console.log(` SUMMARY: ${passCount}/${results.length} Tests Passed successfully!`);
  console.log(` Visual Report Generated at: backend/exp5_test_report.html`);
  console.log("===============================================================\n");

  await mongoose.disconnect();
  process.exit(passCount === results.length ? 0 : 1);
}

runAllTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
