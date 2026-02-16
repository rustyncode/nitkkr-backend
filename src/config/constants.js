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

  FIREBASE_PROJECT_ID: getEnv("FIREBASE_PROJECT_ID"),
  FIREBASE_APP_ID: getEnv("FIREBASE_APP_ID"),
  FIREBASE_STORAGE_BUCKET: getEnv("FIREBASE_STORAGE_BUCKET"),

  STORAGE_API_URL: getEnv("STORAGE_API_URL"),

  SCRAPE_SCHEDULE: process.env.SCRAPE_SCHEDULE || "0 0 * * *", // Daily at midnight UTC

  DATABASE_URL: getEnv("DATABASE_URL"),
};

module.exports = constants;
