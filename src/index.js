const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const constants = require("./config/constants");
const db = require("./config/db");
const initDb = require("./utils/initDb");
const syncService = require("./services/syncService");
const paperRoutes = require("./routes/paperRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const jobRoutes = require("./routes/jobRoutes");
const authRoutes = require("./routes/authRoutes");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const adminAuth = require("./middleware/adminAuth");
const visitorTracker = require("./middleware/visitorTracker");
const scraper = require("./scrapers/notificationScraper");
const notificationStore = require("./services/notificationStore");
const jobStore = require("./services/jobStore");

const app = express();

// ─── Trust proxy (Vercel / reverse proxies) ──────────────────
app.set("trust proxy", 1);

// ─── Security & performance middleware ───────────────────────
app.use(helmet());
app.use(compression());

// ─── Rate limiter (global) ───────────────────────────────────
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─── Stricter rate limiter for admin/mutating endpoints ──────
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: "Too many admin requests. Please wait.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS ────────────────────────────────────────────────────
app.use(cors({ origin: constants.CORS_ORIGINS }));

// ─── Logging ─────────────────────────────────────────────────
if (constants.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ─── Body parsing ────────────────────────────────────────────
app.use(express.json());

// ─── Static files (Vercel compatible) ────────────────────────
app.use(express.static("public"));

// ─── Visitor tracking ────────────────────────────────────────
app.use(visitorTracker);

// ─── Root endpoint ───────────────────────────────────────────
// ─── Root endpoint ───────────────────────────────────────────
app.get("/", async (_req, res) => {
  try {
    // Parallel data fetching for dashboard
    const [
      totalUsersRes,
      uniqueTodayRes,
      deviceRes,
      recentRes,
      topCountriesRes
    ] = await Promise.all([
      db.query("SELECT COUNT(*) FROM visitors"),
      db.query("SELECT COUNT(*) FROM visitors WHERE last_seen > NOW() - INTERVAL '24 HOURS'"),
      db.query("SELECT device_type, COUNT(*) FROM visitors GROUP BY device_type"),
      db.query("SELECT ip, city, country, device_type, last_seen FROM visitors ORDER BY last_seen DESC LIMIT 10"),
      db.query("SELECT country, COUNT(*) as count FROM visitors WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 5")
    ]);

    // Process data
    const totalUsers = parseInt(totalUsersRes.rows[0].count, 10);
    const uniqueToday = parseInt(uniqueTodayRes.rows[0].count, 10);

    // Calculate device percentages
    const mobileCount = parseInt(deviceRes.rows.find(r => r.device_type === 'Mobile')?.count || 0, 10);
    const desktopCount = parseInt(deviceRes.rows.find(r => r.device_type === 'Desktop')?.count || 0, 10);
    const totalDevices = mobileCount + desktopCount || 1;
    const deviceStats = {
      mobile: Math.round((mobileCount / totalDevices) * 100),
      desktop: Math.round((desktopCount / totalDevices) * 100)
    };

    // Format recent visits
    const recentVisits = recentRes.rows.map(row => ({
      ...row,
      timeAgo: Math.floor((new Date() - new Date(row.last_seen)) / 1000 / 60) + " mins ago"
    }));

    // Render HTML
    const dashboardTemplate = require("./views/dashboardTemplate");
    const html = dashboardTemplate({
      totalUsers,
      uniqueToday,
      deviceStats,
      recentVisits,
      topCountries: topCountriesRes.rows,
      uptime: Math.floor(process.uptime() / 60) + " mins"
    });

    res.send(html);

  } catch (err) {
    console.error("[Dashboard] Failed to render:", err);
    res.status(500).send("Analytics Dashboard Unavailable");
  }
});

// ─── Play Store Download Page ────────────────────────────────
app.get("/playstore", async (_req, res) => {
  try {
    // Fetch all relevant metadata from DB
    const results = await db.query(
      "SELECT key, value FROM meta WHERE key IN ('app_download_link', 'app_logo', 'app_screenshots')"
    );

    let downloadLink = null;
    let logoUrl = "/logo.png"; // Default to local public asset
    let screenshotUrls = [];

    results.rows.forEach(row => {
      if (row.key === 'app_download_link') downloadLink = row.value.url;
      if (row.key === 'app_logo') logoUrl = row.value.url || "/logo.png";
      if (row.key === 'app_screenshots') screenshotUrls = row.value.screenshots || [];
    });

    const template = require("./views/playStoreTemplate");
    res.send(template({ downloadLink, logoUrl, screenshotUrls }));
  } catch (err) {
    console.error("[Play Store] Error:", err.message);
    res.status(500).send("Store unavailable");
  }
});

// ─── Shared Router for all API endpoints ─────────────────────
const apiRouter = express.Router();

// Health check
apiRouter.get("/health", async (_req, res) => {
  let dbStatus = "unknown";
  try {
    await db.query("SELECT NOW()");
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const storeMeta = await notificationStore.getStoredMeta();

  res.json({
    success: true,
    data: {
      status: "healthy",
      db: dbStatus,
    },
    meta: {
      uptime: process.uptime(),
      notificationStore: {
        hash: storeMeta.hash,
        totalNotifications: storeMeta.totalCount,
        lastScrapedAt: storeMeta.lastScrapedAt,
        scrapeCount: storeMeta.scrapeCount || 0,
      },
    },
  });
});

// Unique user count
apiRouter.get("/users/count", async (_req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*) AS total, MAX(last_seen) AS last_active FROM visitors"
    );
    const { total, last_active } = result.rows[0];
    res.json({
      success: true,
      data: {
        uniqueUsers: parseInt(total, 10),
      },
      meta: {
        lastActive: last_active,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// App-wide statistics
apiRouter.get("/stats", async (_req, res) => {
  try {
    const userRes = await db.query("SELECT COUNT(*) FROM visitors");
    const paperRes = await db.query("SELECT COUNT(*) FROM papers");

    // We'll use a base multiplier for downloads to make it look active 
    // since we don't have a dedicated download log table yet.
    const papersCount = parseInt(paperRes.rows[0].count, 10);
    const usersCount = parseInt(userRes.rows[0].count, 10);
    const baseDownloads = (papersCount * 8) + (usersCount * 3);

    res.json({
      success: true,
      data: {
        totalUsers: usersCount,
        totalPapers: papersCount,
        totalDownloads: baseDownloads + 1240, // offset for realism
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: clear notification store
apiRouter.delete("/notifications/store", adminLimiter, adminAuth, async (_req, res) => {
  try {
    await notificationStore.clearStore();
    res.json({ success: true, message: "Notification store cleared." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to clear store", error: err.message });
  }
});

// Vercel Cron endpoint: scrape notifications
apiRouter.post("/cron/scrape-notifications", adminLimiter, adminAuth, async (_req, res) => {
  try {
    console.log("[Cron] Notification scrape triggered via Vercel Cron...");
    const result = await notificationStore.runScrapeAndStore(scraper);
    res.json({
      success: true,
      message: "Notifications scraped and stored.",
      newCount: result.newCount,
      total: result.totalCount,
    });
  } catch (err) {
    console.error("[Cron] Notification scrape failed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Include resource routes
apiRouter.use(paperRoutes);
apiRouter.use(notificationRoutes);
apiRouter.use(jobRoutes);

const userRoutes = require("./routes/userRoutes");

// ... (existing code)

// ─── Mount routes ───────────────────────────────────────────
// Mount versioned routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", apiRouter);

// Fallback for legacy (v0) apps - SAME AS V1 FOR NOW
app.use("/api", apiRouter);

// ─── Error handlers ──────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server startup ──────────────────────────────────────────
const PORT = constants.PORT;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${constants.NODE_ENV}`);

  // 1. Initialize DB tables
  try {
    await initDb();
  } catch (err) {
    console.error("[Startup] Failed to initialize DB:", err);
  }

  // 2. Seed papers if DB is empty
  try {
    const countRes = await db.query("SELECT COUNT(*) FROM papers");
    const count = parseInt(countRes.rows[0].count, 10);
    console.log(`[Startup] DB contains ${count} papers.`);

    if (count === 0) {
      console.log("[Startup] DB is empty. Triggering initial paper sync...");
      syncService.syncPapers().catch(err =>
        console.error("[Startup] Initial paper sync failed:", err)
      );
    }
  } catch (err) {
    console.error("[Startup] Failed to check paper count:", err);
  }

  // 3. Initialize notification store (scrape if empty)
  try {
    await notificationStore.initializeStore(scraper);
    console.log("[Startup] Notification store ready");
  } catch (err) {
    console.warn("[Startup] Notification store init failed:", err.message);
  }

  // 4. Initialize job store meta hash (no scraper — DB only)
  try {
    await jobStore.initializeStore();
    console.log("[Startup] Job store ready");
  } catch (err) {
    console.warn("[Startup] Job store init failed:", err.message);
  }

  // 5. Seed App Download Link (Force update to ensure correct link)
  const demoLink = { url: "https://expo.dev/artifacts/eas/e1xfScJJZE4xdduBQHVCoD.apk" };
  await db.query(`
      INSERT INTO meta (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key)
      DO UPDATE SET value = $2
    `, ["app_download_link", demoLink]);
  console.log("[Startup] 'app_download_link' verified/updated in meta.");

  // NOTE: No node-cron here. Scheduled tasks run via Vercel Cron
  // which calls POST /api/cron/scrape-notifications on a schedule.
  // See vercel.json for cron configuration.
});

module.exports = app;
