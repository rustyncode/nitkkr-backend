const scraper = require("../scrapers/notificationScraper");

// GET /api/notifications/recent
async function getRecentNotifications(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const clampedDays = Math.min(Math.max(days, 1), 365);

    const result = await scraper.getRecentNotifications(clampedDays);

    return res.json({
      success: true,
      data: result.items,
      total: result.total,
      days: result.days,
      fromCache: result.fromCache,
      lastFetched: result.lastFetched,
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
    const result = await scraper.getAllNotifications();

    // Optional pagination via query params
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const category = req.query.category || "";
    const search = req.query.q || "";

    let items = result.items;

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

    const totalRecords = items.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedItems = items.slice(startIdx, endIdx);

    return res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages,
        hasMore: page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
      },
      stats: {
        announcementsCount: result.announcementsCount,
        notificationsCount: result.notificationsCount,
        totalMerged: result.total,
      },
      fromCache: result.fromCache,
      lastFetched: result.lastFetched,
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

// GET /api/notifications/categories
async function getCategories(req, res) {
  try {
    const result = await scraper.getAllNotifications();

    const categoryCount = {};
    for (const item of result.items) {
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
    scraper.invalidateCache();
    const result = await scraper.getAllNotifications();

    return res.json({
      success: true,
      message: "Notifications cache refreshed",
      total: result.total,
      lastFetched: result.lastFetched,
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

module.exports = {
  getRecentNotifications,
  getAllNotifications,
  getCategories,
  refreshNotifications,
};
