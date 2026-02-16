function notFoundHandler(req, res, _next) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function globalErrorHandler(err, _req, res, _next) {
  console.error("[ErrorHandler]", err.stack || err.message || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
