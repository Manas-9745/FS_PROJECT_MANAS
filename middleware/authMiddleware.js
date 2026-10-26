const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  try {
    const actualToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    if (!actualToken) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(
      actualToken,
      process.env.JWT_SECRET || "your_strong_secret_key"
    );

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// ROLE AUTHORIZATION
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission.",
      });
    }
    next();
  };
};

protect.protect = protect;
protect.authorize = authorize;

module.exports = protect;
module.exports.protect = protect;
module.exports.authorize = authorize;
