const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------------------
// EXP 6: PROTECTED ROUTES & ROLE-BASED ACCESS CONTROL
// ---------------------------------------------------------------------

// USER + ADMIN: Protected Dashboard Route
// @route   GET /api/user/dashboard
router.get("/dashboard", protect, (req, res) => {
  res.json({
    message: "Welcome to the protected dashboard",
    user: req.user,
  });
});

// ADMIN ONLY: Protected Admin Route
// @route   GET /api/user/admin
router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.json({
    message: "Welcome Admin! You can access this page.",
  });
});

// ADMIN ONLY: Get all registered users from MongoDB Atlas
// @route   GET /api/user/all
router.get("/all", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({
      message: "Users retrieved successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

// ---------------------------------------------------------------------
// EXP 5 COMPATIBILITY: Registration, Login & Profile routes
// ---------------------------------------------------------------------

// Protected Profile route
// @route   GET /api/users/profile or /api/user/profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// User Registration (with express-validator for Exp 5)
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Enter valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must contain at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    try {
      const { name, email, password, role } = req.body;
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: role || "user",
      });

      res.status(201).json({
        message: "User registered successfully",
        userId: user._id,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Registration failed", error: error.message });
    }
  }
);

// User Login (Exp 5 / Exp 6 fallback)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Real-time update to MongoDB Atlas on every login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastTokenIssued = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "your_strong_secret_key",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

module.exports = router;
