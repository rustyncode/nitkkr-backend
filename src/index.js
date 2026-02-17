const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");

const constants = require("./config/constants");
const db = require("./config/db");
const initDb = require("./utils/initDb");
const syncService = require("./services/syncService");
const paperRoutes = require("./routes/paperRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const jobRoutes = require("./routes/jobRoutes");

const { notFoundHandler, globalErrorHandler } = require("./middleware/errorHandler");
const scraper = require("./scrapers/notificationScraper");
const notificationStore = require("./services/notificationStore");
const jobStore = require("./services/jobStore");

const app = express();

// Trust Proxy for production (Vercel/Heroku/etc)
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Allow more requests per IP
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
    version: "1.2.1", // Fixed property and routing issues
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
      jobs: "/api/jobs"
    },
  });
});

app.get("/api/health", async (_req, res) => {
  // Check DB health
  let dbStatus = "unknown";
  try {
    const timeRes = await db.query("SELECT NOW()");
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const storeMeta = await notificationStore.getStoredMeta();

  res.json({
    success: true,
    status: "healthy",
    db: dbStatus,
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

// Routes are handled by notificationRoutes.js (mounted at /api)

app.delete("/api/notifications/store", async (_req, res) => {
  try {
    await notificationStore.clearStore();
    res.json({ success: true, message: "Notification store cleared." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to clear store", error: err.message });
  }
});

app.use("/api", paperRoutes);
app.use("/api", notificationRoutes);
app.use("/api", jobRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = constants.PORT;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${constants.NODE_ENV}`);

  // 1. Initialize DB
  try {
    await initDb();
  } catch (err) {
    console.error("[Startup] Failed to initialize DB:", err);
  }

  // 2. Check and Sync Data
  try {
    const countRes = await db.query("SELECT COUNT(*) FROM papers");
    const count = parseInt(countRes.rows[0].count, 10);
    console.log(`[Startup] DB contains ${count} papers.`);

    if (count === 0) {
      console.log("[Startup] DB is empty. triggering initial sync...");
      // Background sync, don't await blocking
      syncService.syncPapers().catch(err => console.error("Initial sync failed:", err));
    }
  } catch (err) {
    console.error("[Startup] Failed to check paper count:", err);
  }

  // 3. Schedule Weekly Sync (Every Sunday at midnight)
  cron.schedule("0 0 * * 0", async () => {
    console.log("[Scheduler] Starting weekly paper sync...");
    await syncService.syncPapers();
  });
  console.log("[Startup] Scheduled weekly sync for 0 0 * * 0");

  // 4. Initialize Notification Store
  try {
    await notificationStore.initializeStore(scraper);
    console.log(`[Startup] Notification store ready`);
  } catch (err) {
    console.warn("[Startup] Notification store init failed:", err.message);
  }

  // 5. Start Notification Scheduler
  try {
    notificationStore.startScheduler(scraper, constants.SCRAPE_SCHEDULE);
  } catch (err) {
    console.warn("[Startup] Notif scheduler failed:", err.message);
  }

  // 6. Initialize Job Store & Start Scheduler
  try {
    const jobScraper = require("./scrapers/jobScraper");
    await jobStore.initializeStore(jobScraper);
    jobStore.startScheduler(jobScraper, "0 2 * * *"); // Daily at 2 AM
    console.log("[Startup] Job store and scheduler ready");
  } catch (err) {
    console.warn("[Startup] Job store init failed:", err.message);
  }

});

module.exports = app;
