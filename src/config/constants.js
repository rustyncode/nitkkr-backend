const path = require("path");
require("dotenv").config();

// Helper to enforce env vars in production
function getEnv(key, defaultValue) {
  const value = process.env[key];
  if (!value && typeof defaultValue === "undefined") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue;
}

const constants = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: getEnv("NODE_ENV", "development"),

  // Data path maintained in src for Vercel deployment compatibility
  DATA_PATH: process.env.DATA_PATH || path.join(__dirname, "..", "data", "pyq_data.json"),

  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || 10, 10),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || 50, 10),

  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : ["*"],

  // --- User's Auth Project (Phase 1) ---
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || null,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || null,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : null,

  // --- Legacy/Friend's PYQ Storage Project ---
  PYQ_FIREBASE_PROJECT_ID: getEnv("PYQ_FIREBASE_PROJECT_ID"),
  PYQ_FIREBASE_APP_ID: getEnv("PYQ_FIREBASE_APP_ID"),
  PYQ_FIREBASE_STORAGE_BUCKET: getEnv("PYQ_FIREBASE_STORAGE_BUCKET"),
  PYQ_STORAGE_API_URL: getEnv("PYQ_STORAGE_API_URL"),

  SCRAPE_SCHEDULE: process.env.SCRAPE_SCHEDULE || "0 0 * * *", // Daily at midnight UTC

  DATABASE_URL: getEnv("DATABASE_URL"),

  // Secret key for admin/destructive endpoints.
  // Set ADMIN_SECRET in your .env and Vercel environment variables.
  // Pass as: x-admin-key: <secret> header on admin requests.
  ADMIN_SECRET: process.env.ADMIN_SECRET || null,

  RESEND_API_KEY: process.env.RESEND_API_KEY || null,
  SMTP_USER: process.env.SMTP_USER || null,
  SMTP_PASS: process.env.SMTP_PASS || null,
};

module.exports = constants;
