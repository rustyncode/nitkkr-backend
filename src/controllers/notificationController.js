const notificationStore = require("../services/notificationStore");

// GET /api/notifications/recent
async function getRecentNotifications(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const clampedDays = Math.min(Math.max(days, 1), 365);

    // DB-First: Get from store
    const items = await notificationStore.getNotificationsFromDb(500);
    const meta = await notificationStore.getStoredMeta();

    // Flag-based Sync: Check if hash matches
    const clientHash = req.query.clientHash;
    if (clientHash && clientHash === meta.hash) {
      return res.json({
        success: true,
        hasUpdates: false,
        lastFetched: meta.lastScrapedAt,
      });
    }

    // Filter by days in JS for simplicity (could be in SQL too)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - clampedDays);
    const filtered = items.filter(item => new Date(item.date) >= cutoff);

    return res.json({
      success: true,
      hasUpdates: true,
      data: filtered,
      hash: meta.hash,
      total: filtered.length,
      days: clampedDays,
      fromCache: true,
      lastFetched: meta.lastScrapedAt,
    });
  } catch (err) {
    console.error("[NotificationController] getRecentNotifications error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent notifications",
      error: err.message,
    });
  }
}

// GET /api/notifications
async function getAllNotifications(req, res) {
  try {
    const itemsRaw = await notificationStore.getNotificationsFromDb(1000);
    const meta = await notificationStore.getStoredMeta();

    // Optional pagination via query params
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const category = req.query.category || "";
    const search = req.query.q || "";

    let items = itemsRaw;

    // Filter by category if provided
    if (category) {
      items = items.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search query if provided
    if (search) {
      const searchLower = search.toLowerCase().trim();
      const searchTerms = searchLower.split(/\s+/);
      items = items.filter((item) => {
        const text = `${item.title} ${item.category} ${item.date}`.toLowerCase();
        return searchTerms.every((term) => text.includes(term));
      });
    }

    // Flag-based Sync: Check if hash matches
    const clientHash = req.query.clientHash;
    if (clientHash && clientHash === meta.hash && page === 1) { // Only for first page
      return res.json({
        success: true,
        hasUpdates: false,
        hash: meta.hash,
        lastFetched: meta.lastScrapedAt,
      });
    }

    const totalRecords = items.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedItems = items.slice(startIdx, endIdx);

    // Background Sync: Trigger if stale (> 12 hours)
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
      hasUpdates: true,
      data: paginatedItems,
      hash: meta.hash,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages,
        hasMore: page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
      },
      stats: {
        announcementsCount: meta.announcementsCount,
        notificationsCount: meta.notificationsCount,
        totalMerged: meta.total,
      },
      fromCache: true,
      lastFetched: meta.lastScrapedAt,
    });
  } catch (err) {
    console.error("[NotificationController] getAllNotifications error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: err.message,
    });
  }
}

const CATEGORY_CONFIG = {
  Examination: {
    icon: "school-outline",
    color: "#C62828",
    bgColor: "#FFEBEE",
  },
  "Exam Date Sheets": {
    icon: "document-text-outline",
    color: "#D32F2F",
    bgColor: "#FFCDD2",
  },
  Results: {
    icon: "trophy-outline",
    color: "#FFD700",
    bgColor: "#FFF9C4",
  },
  Scholarship: {
    icon: "cash-outline",
    color: "#2E7D32",
    bgColor: "#E8F5E9",
  },
  Placements: {
    icon: "rocket-outline",
    color: "#FF4500",
    bgColor: "#FFCCBC",
  },
  Recruitment: {
    icon: "briefcase-outline",
    color: "#1565C0",
    bgColor: "#E3F2FD",
  },
  Admission: {
    icon: "enter-outline",
    color: "#6A1B9A",
    bgColor: "#F3E5F5",
  },
  Events: {
    icon: "calendar-outline",
    color: "#E65100",
    bgColor: "#FFF3E0",
  },
  "Sports & Culture": {
    icon: "musical-notes-outline",
    color: "#d81b60",
    bgColor: "#fce4ec",
  },
  "Academic Event": {
    icon: "flask-outline",
    color: "#00838F",
    bgColor: "#E0F7FA",
  },
  "Student Welfare": {
    icon: "people-outline",
    color: "#4527A0",
    bgColor: "#EDE7F6",
  },
  Administrative: {
    icon: "document-outline",
    color: "#455A64",
    bgColor: "#ECEFF1",
  },
  "Academic Calendar": {
    icon: "calendar-number-outline",
    color: "#1976D2",
    bgColor: "#BBDEFB",
  },
  Academic: {
    icon: "library-outline",
    color: "#0277BD",
    bgColor: "#E1F5FE",
  },
  General: {
    icon: "megaphone-outline",
    color: "#5D4037",
    bgColor: "#EFEBE9",
  },
};

// GET /api/notifications/categories
async function getCategories(req, res) {
  try {
    const items = await notificationStore.getNotificationsFromDb(1000);

    const categoryCount = {};
    for (const item of items) {
      const cat = item.category || "General";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }

    const categories = Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      data: categories,
      total: categories.length,
    });
  } catch (err) {
    console.error("[NotificationController] getCategories error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification categories",
      error: err.message,
    });
  }
}

// POST /api/notifications/refresh
async function refreshNotifications(req, res) {
  try {
    const scraper = require("../scrapers/notificationScraper");
    const result = await notificationStore.runScrapeAndStore(scraper);

    return res.json({
      success: true,
      message: "Notifications refreshed from source",
      newCount: result.newCount,
      total: result.totalCount,
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[NotificationController] refreshNotifications error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh notifications",
      error: err.message,
    });
  }
}

// GET /api/notifications/digest
async function getDigest(req, res) {
  try {
    const digest = await notificationStore.getDigest();
    return res.json({ success: true, data: digest });
  } catch (err) {
    console.error("[NotificationController] getDigest error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to get notification digest", error: err.message });
  }
}

// GET /api/notifications/digest/full
async function getDigestFull(req, res) {
  try {
    const fullStore = await notificationStore.getFullStore();
    return res.json({ success: true, data: fullStore });
  } catch (err) {
    console.error("[NotificationController] getDigestFull error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to get full notification store", error: err.message });
  }
}

module.exports = {
  getRecentNotifications,
  getAllNotifications,
  getCategories,
  refreshNotifications,
  getDigest,
  getDigestFull,
};
