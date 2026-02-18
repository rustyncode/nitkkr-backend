/**
 * Job Store — DB-only implementation.
 * Jobs are managed directly in the `jobs` table.
 * No scraper involved. Add/edit jobs via DB or a future admin API.
 */
const crypto = require("crypto");
const db = require("../config/db");

// ─── Hash generation ─────────────────────────────────────────

function generateHash(items) {
    if (!items || items.length === 0) return "empty";
    const content = items
        .map((item) => `${item.title || ""}|${item.company || ""}|${item.id || ""}`)
        .sort()
        .join("\n");
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
}

// ─── Get stored meta (hash + last updated) ──────────────────

async function getStoredMeta() {
    try {
        const res = await db.query("SELECT value FROM meta WHERE key = $1", ["job_meta"]);
        if (res.rows.length > 0) return res.rows[0].value;
        return { hash: "empty", lastScrapedAt: null };
    } catch (err) {
        console.error("[JobStore] Failed to get meta:", err.message);
        return { hash: "empty", lastScrapedAt: null };
    }
}

// ─── Get all active jobs ─────────────────────────────────────

async function getAllJobs() {
    try {
        const res = await db.query(
            "SELECT * FROM jobs WHERE is_active = TRUE ORDER BY created_at DESC"
        );
        return res.rows;
    } catch (err) {
        console.error("[JobStore] Failed to get jobs:", err.message);
        throw err;
    }
}

// ─── Refresh meta hash (call after any DB job change) ────────
// This keeps the clientHash sync working correctly.

async function refreshMeta() {
    try {
        const jobs = await getAllJobs();
        const hash = generateHash(jobs);
        await db.query(
            "INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
            ["job_meta", { hash, lastScrapedAt: new Date().toISOString() }]
        );
        console.log(`[JobStore] Meta refreshed. Hash: ${hash}, Jobs: ${jobs.length}`);
        return { hash };
    } catch (err) {
        console.error("[JobStore] refreshMeta failed:", err.message);
    }
}

// ─── Initialize: ensure meta exists on startup ───────────────

async function initializeStore() {
    const meta = await getStoredMeta();
    if (!meta.hash || meta.hash === "empty") {
        console.log("[JobStore] No meta found, generating initial hash from DB...");
        await refreshMeta();
    } else {
        console.log(`[JobStore] Store ready. Hash: ${meta.hash}`);
    }
}

module.exports = {
    getAllJobs,
    getStoredMeta,
    refreshMeta,
    initializeStore,
};
