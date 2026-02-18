const notificationStore = require("../services/notificationStore");
const { catchAsync } = require("../middleware/errorHandler");

// GET /api/notifications/recent
const getRecentNotifications = catchAsync(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const clampedDays = Math.min(Math.max(days, 1), 365);
  const clientHash = req.query.clientHash;

  const meta = await notificationStore.getStoredMeta();

  // Flag-based Sync: Check if hash matches
  if (clientHash && clientHash === meta.hash) {
    return res.json({
      success: true,
      data: [],
      meta: {
        hasUpdates: false,
        lastFetched: meta.lastScrapedAt,
        hash: meta.hash,
      },
    });
  }

  // Fetch only what's needed for "recent" (e.g., last 500)
  // Note: days filter is still useful but we can now rely on the 30-day limit in DB
  const { rows: items } = await notificationStore.getNotificationsFromDb({ limit: 500 });

  return res.json({
    success: true,
    data: items,
    meta: {
      hasUpdates: true,
      hash: meta.hash,
      total: items.length,
      days: clampedDays,
      lastFetched: meta.lastScrapedAt,
    },
  });
});

// GET /api/notifications
const getAllNotifications = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const category = req.query.category || "";
  const search = req.query.q || "";
  const clientHash = req.query.clientHash;

  const meta = await notificationStore.getStoredMeta();

  // Flag-based Sync: Check if hash matches (only for first page)
  if (clientHash && clientHash === meta.hash && page === 1 && !category && !search) {
    return res.json({
      success: true,
      data: [],
      meta: {
        hasUpdates: false,
        hash: meta.hash,
        lastFetched: meta.lastScrapedAt,
      },
    });
  }

  const offset = (page - 1) * limit;
  const { rows: items, totalCount } = await notificationStore.getNotificationsFromDb({
    limit,
    offset,
    category,
    search
  });

  const totalPages = Math.ceil(totalCount / limit);

  // Background Sync: Trigger if stale (> 12 hours) - keep existing logic but wrapped
  const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000;
  const lastScrapedAt = meta.lastScrapedAt ? new Date(meta.lastScrapedAt).getTime() : 0;
  if (Date.now() - lastScrapedAt > STALE_THRESHOLD_MS) {
    console.log("[NotificationController] Data stale, triggering background sync...");
    const scraper = require("../scrapers/notificationScraper");
    notificationStore.runScrapeAndStore(scraper).catch(err => {
      console.error("[NotificationController] Background sync failed:", err.message);
    });
  }

  return res.json({
    success: true,
    data: items,
    meta: {
      hasUpdates: true,
      hash: meta.hash,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords: totalCount,
        totalPages,
        hasMore: page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
      },
      lastFetched: meta.lastScrapedAt,
    },
  });
});

// GET /api/notifications/categories
const getCategories = catchAsync(async (req, res) => {
  const categories = await notificationStore.getCategoryStats();
  return res.json({
    success: true,
    data: categories,
    meta: {
      total: categories.length,
    },
  });
});

// POST /api/notifications/refresh
const refreshNotifications = catchAsync(async (req, res) => {
  const scraper = require("../scrapers/notificationScraper");
  const result = await notificationStore.runScrapeAndStore(scraper);

  return res.json({
    success: true,
    data: null,
    meta: {
      message: "Notifications refreshed from source",
      newCount: result.newCount,
      total: result.totalCount,
      lastFetched: new Date().toISOString(),
    },
  });
});

// GET /api/notifications/digest
const getDigest = catchAsync(async (req, res) => {
  const digest = await notificationStore.getDigest();
  return res.json({ success: true, data: digest });
});

// GET /api/notifications/digest/full
const getDigestFull = catchAsync(async (req, res) => {
  const fullStore = await notificationStore.getFullStore();
  return res.json({ success: true, data: fullStore });
});

module.exports = {
  getRecentNotifications,
  getAllNotifications,
  getCategories,
  refreshNotifications,
  getDigest,
  getDigestFull,
};
