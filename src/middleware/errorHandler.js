/**
 * Centralized Error Handling Middleware
 * Standardizes the error response shape across the entire API.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ErrorHandler] ${req.method} ${req.path}:`, {
    status: statusCode,
    message: message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
}

/**
 * Wrapper to catch async errors in Express routes
 * Prevents the need for try/catch in every controller
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  catchAsync,
};
