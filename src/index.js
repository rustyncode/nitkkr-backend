const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const constants = require("./config/constants");
const paperRoutes = require("./routes/paperRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { notFoundHandler, globalErrorHandler } = require("./middleware/errorHandler");
const dataLoader = require("./utils/dataLoader");
const scraper = require("./scrapers/notificationScraper");
const notificationStore = require("./services/notificationStore");

const app = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

app.use(cors({ origin: constants.CORS_ORIGINS }));

if (constants.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "NIT KKR PYQ API is running",
    version: "1.1.0",
    environment: constants.NODE_ENV,
    endpoints: {
      papers: "/api/papers",
      allPapers: "/api/papers/all",
      singlePaper: "/api/papers/:id",
      filters: "/api/filters",
      stats: "/api/stats",
      subjects: "/api/subjects",
      notifications: "/api/notifications",
      recentNotifications: "/api/notifications/recent",
      notificationCategories: "/api/notifications/categories",
      refreshNotifications: "POST /api/notifications/refresh",
      digest: "/api/notifications/digest",
      digestFull: "/api/notifications/digest/full",
    },
  });
});

app.get("/api/health", (_req, res) => {
  const meta = dataLoader.getMeta();
  const storeMeta = notificationStore.getStoredMeta();

  res.json({
    success: true,
    status: "healthy",
    totalRecords: dataLoader.getRecords().length,
    extractedAt: meta.extractedAt || null,
    uptime: process.uptime(),
    scraper: "active",
    notificationStore: {
      hash: storeMeta.hash,
      totalNotifications: storeMeta.totalCount,
      lastScrapedAt: storeMeta.lastScrapedAt,
      scrapeCount: storeMeta.scrapeCount || 0,
    },
  });
});

app.get("/api/notifications/digest", (_req, res) => {
  try {
    const digest = notificationStore.getDigest();
    res.json({ success: true, data: digest });
  } catch (err) {
    console.error("[Digest] Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to get notification digest", error: err.message });
  }
});

app.get("/api/notifications/digest/full", (_req, res) => {
  try {
    const fullStore = notificationStore.getFullStore();
    res.json({ success: true, data: fullStore });
  } catch (err) {
    console.error("[DigestFull] Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to get full notification store", error: err.message });
  }
});

app.post("/api/notifications/scrape", async (_req, res) => {
  try {
    console.log("[API] Manual scrape triggered...");
    const result = await notificationStore.runScrapeAndStore(scraper);
    res.json({
      success: true,
      message: `Scrape complete. ${result.newCount} new notification(s) found.`,
      data: {
        newCount: result.newCount,
        totalCount: result.totalCount,
        hash: result.hash,
        changed: result.changed,
        newItems: (result.newItems || []).slice(0, 10).map((item) => ({
          title: item.title,
          date: item.date,
          category: item.category,
        })),
      },
    });
  } catch (err) {
    console.error("[API] Manual scrape failed:", err.message);
    res.status(500).json({ success: false, message: "Scrape failed", error: err.message });
  }
});

app.delete("/api/notifications/store", (_req, res) => {
  try {
    notificationStore.clearStore();
    res.json({ success: true, message: "Notification store cleared." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to clear store", error: err.message });
  }
});

app.use("/api", paperRoutes);
app.use("/api", notificationRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = constants.PORT;

const server = app.listen(PORT, async () => {
  dataLoader.loadData();
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${constants.NODE_ENV}`);

  try {
    await notificationStore.initializeStore(scraper);
    console.log(`[Startup] Notification store ready`);
  } catch (err) {
    console.warn("[Startup] Notification store init failed:", err.message);
  }

  try {
    notificationStore.startScheduler(scraper, constants.SCRAPE_SCHEDULE);
  } catch (err) {
    console.warn("[Startup] Scheduler start failed:", err.message);
  }
});

module.exports = app;
