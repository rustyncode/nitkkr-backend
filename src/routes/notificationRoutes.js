const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// GET /api/notifications — get all notifications (paginated, filterable)
router.get("/notifications", notificationController.getAllNotifications);

// GET /api/notifications/recent — get notifications from the last N days (default 30)
router.get("/notifications/recent", notificationController.getRecentNotifications);

// GET /api/notifications/categories — get all notification categories with counts
router.get("/notifications/categories", notificationController.getCategories);

// POST /api/notifications/refresh — force-refresh the scraped notification cache
router.post("/notifications/refresh", notificationController.refreshNotifications);

module.exports = router;
