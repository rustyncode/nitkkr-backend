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
    const res = await db.query("SELECT value FROM meta WHERE key = $1", ["notification_meta"]);
    if (res.rows.length > 0) return res.rows[0].value;
    return { hash: "empty", totalCount: 0, lastScrapedAt: null, scrapeCount: 0 };
  } catch (err) {
    console.error("[NotifStore] Failed to get meta:", err.message);
    return { hash: "empty", totalCount: 0 };
  }
}

async function getNotificationsFromDb({ limit = 20, offset = 0, category = "", search = "" } = {}) {
  try {
    let where = "WHERE 1=1";
    const params = [];
    let paramIdx = 1;

    if (category) {
      where += ` AND category = $${paramIdx++}`;
      params.push(category);
    }

    if (search) {
      where += ` AND (title ILIKE $${paramIdx} OR category ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const res = await db.query(
      `SELECT title, date, link, category, source, created_at 
       FROM notifications 
       ${where} 
       ORDER BY date DESC, created_at DESC 
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    const countRes = await db.query(`SELECT COUNT(*) FROM notifications ${where}`, params);

    return {
      rows: res.rows,
      totalCount: parseInt(countRes.rows[0].count, 10)
    };
  } catch (err) {
    console.error("[NotifStore] Failed to get notifications:", err.message);
    return { rows: [], totalCount: 0 };
  }
}

async function getCategoryStats() {
  try {
    const res = await db.query(
      "SELECT category as name, COUNT(*) as count FROM notifications GROUP BY category ORDER BY count DESC"
    );
    return res.rows;
  } catch (err) {
    console.error("[NotifStore] Failed to get category stats:", err.message);
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
           ON CONFLICT (title, date) 
           DO UPDATE SET 
             category = EXCLUDED.category,
             link = EXCLUDED.link,
             source = EXCLUDED.source
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
  const recentRes = await db.query("SELECT title, date, category FROM notifications ORDER BY created_at DESC LIMIT 5");
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
  // Fetch a large number to ensure we get all relevant notifications for sync
  const { rows } = await getNotificationsFromDb({ limit: 500 });
  const meta = await getStoredMeta();
  return {
    items: rows,
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

    console.log(`[NotifStore] Cleaning up notifications older than ${dateStr} or with invalid format...`);

    // 1. Delete items with invalid date format (anything not YYYY-MM-DD)
    const formatRes = await db.query(
      "DELETE FROM notifications WHERE date !~ '^\\d{4}-\\d{2}-\\d{2}$'"
    );

    // 2. Delete items older than cutoff
    const oldRes = await db.query(
      "DELETE FROM notifications WHERE date < $1",
      [dateStr]
    );

    const totalDeleted = (formatRes.rowCount || 0) + (oldRes.rowCount || 0);
    console.log(`[NotifStore] Total items cleaned: ${totalDeleted} (${formatRes.rowCount} format, ${oldRes.rowCount} old)`);
    return totalDeleted;
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



async function initializeStore(scraper) {
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
    await db.query("DELETE FROM notifications");
    await db.query("DELETE FROM meta WHERE key = 'notification_meta'");
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
  getNotificationsFromDb,
  getStoredMeta,
  cleanupOldNotifications,
  getCategoryStats
};
