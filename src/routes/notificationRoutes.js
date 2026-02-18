const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const adminAuth = require("../middleware/adminAuth");

// ── Public endpoints ──────────────────────────────────────────

// GET /api/notifications — all notifications (paginated, filterable)
router.get("/notifications", notificationController.getAllNotifications);

// GET /api/notifications/recent — last N days (default 30)
router.get("/notifications/recent", notificationController.getRecentNotifications);

// GET /api/notifications/categories — category list with counts
router.get("/notifications/categories", notificationController.getCategories);

// GET /api/notifications/digest — lightweight hash check
router.get("/notifications/digest", notificationController.getDigest);

// ── Admin-only endpoints (require x-admin-key header) ─────────

// POST /api/notifications/refresh — force-refresh from NIT KKR website
router.post("/notifications/refresh", adminAuth, notificationController.refreshNotifications);

// GET /api/notifications/digest/full — full store dump
router.get("/notifications/digest/full", notificationController.getDigestFull);

module.exports = router;
