// Centralized Error Handling Middleware (Exp 5 - Secure REST API)
const errorHandler = (err, req, res, next) => {
  console.error("Internal Error:", err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;
