const crypto = require("crypto");
const db = require("../config/db");

function generateHash(items) {
  if (!items || items.length === 0) return "empty";
  const content = items
    .map((item) => `${item.title || ""}|${item.date || ""}|${item.link || ""}`)
    .sort()
    .join("\n");
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
}

async function getStoredMeta() {
  try {
    const res = await db.pool.query("SELECT value FROM meta WHERE key = $1", ["notification_meta"]);
    if (res.rows.length > 0) return res.rows[0].value;
    return { hash: "empty", totalCount: 0, lastScrapedAt: null, scrapeCount: 0 };
  } catch (err) {
    console.error("[NotifStore] Failed to get meta:", err.message);
    return { hash: "empty", totalCount: 0 };
  }
}

async function getNotificationsFromDb(limit = 500) {
  try {
    const res = await db.pool.query(
      "SELECT title, date, link, category, source, created_at FROM notifications ORDER BY date DESC, created_at DESC LIMIT $1",
      [limit]
    );
    return res.rows;
  } catch (err) {
    console.error("[NotifStore] Failed to get notifications:", err.message);
    return [];
  }
}

async function updateStore(freshItems) {
  if (!freshItems || !Array.isArray(freshItems)) {
    return { newItems: [], hash: "empty", changed: false };
  }

  const oldMeta = await getStoredMeta();
  const newHash = generateHash(freshItems);
  const changed = newHash !== oldMeta.hash;
  const now = new Date().toISOString();
  let newItems = [];

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    let successCount = 0;
    for (const item of freshItems) {
      try {
        const res = await client.query(
          `INSERT INTO notifications (title, date, link, category, source, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (title, date) DO NOTHING
           RETURNING id`,
          [item.title, item.date, item.link, item.category, item.source || "general", now]
        );
        if (res.rowCount > 0) {
          newItems.push(item);
          successCount++;
        }
      } catch (e) {
        console.error(`[NotifStore] Insert failed for "${item.title}":`, e.message);
      }
    }
    console.log(`[NotifStore] Attempted ${freshItems.length} inserts, ${successCount} new items added.`);
    const countRes = await client.query("SELECT COUNT(*) FROM notifications");
    const totalCount = parseInt(countRes.rows[0].count, 10);
    const metaPayload = {
      hash: newHash,
      totalCount: totalCount,
      lastScrapedAt: now,
      scrapeCount: (oldMeta.scrapeCount || 0) + 1,
      lastDiffAt: changed ? now : oldMeta.lastDiffAt
    };
    await client.query(
      "INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
      ["notification_meta", metaPayload]
    );
    await client.query("COMMIT");
    if (newItems.length > 0) console.log(`[NotifStore] ${newItems.length} NEW items stored.`);
    return { newItems, newCount: newItems.length, hash: newHash, changed, totalCount };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[NotifStore] Update transaction failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

async function getDigest() {
  const meta = await getStoredMeta();
  const recentRes = await db.pool.query("SELECT title, date, category FROM notifications ORDER BY created_at DESC LIMIT 5");
  return {
    hash: meta.hash,
    totalCount: meta.totalCount,
    lastScrapedAt: meta.lastScrapedAt,
    lastDiffAt: meta.lastDiffAt,
    newItemsCount: 0,
    newItemsTitles: recentRes.rows
  };
}

async function getFullStore() {
  const items = await getNotificationsFromDb(100);
  const meta = await getStoredMeta();
  return {
    items: items,
    totalCount: meta.totalCount,
    hash: meta.hash,
    lastScrapedAt: meta.lastScrapedAt,
    diff: { newItems: [], newCount: 0 }
  };
}

async function cleanupOldNotifications(days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const dateStr = cutoffDate.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`[NotifStore] Cleaning up notifications older than ${dateStr}...`);
    const res = await db.pool.query(
      "DELETE FROM notifications WHERE date < $1",
      [dateStr]
    );
    console.log(`[NotifStore] Deleted ${res.rowCount} old notifications.`);
    return res.rowCount;
  } catch (err) {
    console.error("[NotifStore] Cleanup failed:", err.message);
    return 0;
  }
}

async function runScrapeAndStore(scraper) {
  try {
    // 1. Run cleanup
    await cleanupOldNotifications(30);

    // 2. Scrape
    if (scraper.invalidateCache) scraper.invalidateCache();
    const data = await scraper.scrapeNotifications();
    const allItems = [...(data.announcements || []), ...(data.notifications || [])];

    // 3. Update store
    return await updateStore(allItems);
  } catch (err) {
    console.error("[NotifStore] Scrape/Store failed:", err.message);
    return { newCount: 0, error: err.message };
  }
}

let _cronJob = null;
function startScheduler(scraper, cronExpression = "0 0 * * *") { // Daily at midnight UTC
  try {
    const cron = require("node-cron");
    if (!cron.validate(cronExpression)) {
      console.error("Invalid Cron:", cronExpression);
      return;
    }
    console.log(`[NotifStore] Scheduler started: ${cronExpression}`);
    if (_cronJob) _cronJob.stop();
    _cronJob = cron.schedule(cronExpression, async () => {
      console.log(`[NotifStore] Scrape started...`);
      await runScrapeAndStore(scraper);
    });
  } catch (e) {
    console.warn("[NotifStore] Cron failed", e.message);
  }
}

async function initializeStore(scraper) {
  await db.initDB();
  const meta = await getStoredMeta();
  // Only scrape if DB is totally empty
  if (!meta.hash || meta.hash === "empty") {
    console.log("[NotifStore] Empty DB, initial scrape...");
    return await runScrapeAndStore(scraper);
  }
  return { hash: meta.hash, totalCount: meta.totalCount };
}

async function clearStore() {
  try {
    await db.pool.query("DELETE FROM notifications");
    await db.pool.query("DELETE FROM meta WHERE key = 'notification_meta'");
    console.log("[NotifStore] Store cleared.");
    return true;
  } catch (err) {
    console.error("[NotifStore] Clear failed:", err.message);
    return false;
  }
}

module.exports = {
  updateStore,
  getDigest,
  getFullStore,
  clearStore,
  startScheduler,
  runScrapeAndStore,
  initializeStore,
  getNotificationsFromDb,
  getStoredMeta,
  cleanupOldNotifications
};
