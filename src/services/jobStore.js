const crypto = require("crypto");
const db = require("../config/db");

function generateHash(items) {
    if (!items || items.length === 0) return "empty";
    const content = items
        .map((item) => `${item.title || ""}|${item.company || ""}|${item.id || ""}`)
        .sort()
        .join("\n");
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
}

async function getStoredMeta() {
    try {
        const res = await db.query("SELECT value FROM meta WHERE key = $1", ["job_meta"]);
        if (res.rows.length > 0) return res.rows[0].value;
        return { hash: "empty", lastScrapedAt: null };
    } catch (err) {
        return { hash: "empty" };
    }
}

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

async function cleanupInactiveJobs(client) {
    const res = await client.query("DELETE FROM jobs WHERE is_active = FALSE");
    console.log(`[JobStore] Cleaned up ${res.rowCount} inactive jobs.`);
}

async function updateJobs(freshJobs) {
    if (!freshJobs || !Array.isArray(freshJobs)) return { newCount: 0 };

    let newCount = 0;
    const client = await db.pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Mark existing jobs from these sources as inactive
        const sources = [...new Set(freshJobs.map(j => j.source))];
        if (sources.length > 0) {
            await client.query(
                "UPDATE jobs SET is_active = FALSE WHERE source = ANY($1)",
                [sources]
            );
        }

        // 2. Insert or reactivate jobs
        for (const job of freshJobs) {
            // Check for existing job (active or inactive)
            const checkRes = await client.query(
                "SELECT id FROM jobs WHERE title = $1 AND company = $2 AND source = $3",
                [job.title, job.company, job.source]
            );

            if (checkRes.rows.length === 0) {
                await client.query(
                    `INSERT INTO jobs (title, company, location, stipend, deadline, type, link, category, source, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
                    [job.title, job.company, job.location, job.stipend, job.deadline, job.type, job.link, job.category, job.source]
                );
                newCount++;
            } else {
                // Reactivate and update metadata
                await client.query(
                    "UPDATE jobs SET is_active = TRUE, location = $1, stipend = $2, deadline = $3, type = $4, link = $5 WHERE id = $6",
                    [job.location, job.stipend, job.deadline, job.type, job.link, checkRes.rows[0].id]
                );
            }
        }

        // 3. Delete inactive jobs (those not in the fresh scrape)
        await cleanupInactiveJobs(client);

        // 4. Update Meta Hash
        const allJobs = await getAllJobs();
        const newHash = generateHash(allJobs);
        await client.query(
            "INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
            ["job_meta", { hash: newHash, lastScrapedAt: new Date().toISOString() }]
        );

        await client.query("COMMIT");
        console.log(`[JobStore] Updated jobs. ${newCount} new jobs added.`);
        return { newCount };
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("[JobStore] Update failed:", err.message);
        throw err;
    } finally {
        client.release();
    }
}

async function runScrapeAndStore(scraper) {
    try {
        const jobs = await scraper.scrapeAllJobs();
        console.log(`[JobStore] Scraper found ${jobs.length} jobs.`);
        return await updateJobs(jobs);
    } catch (err) {
        console.error("[JobStore] Scrape and store failed:", err.message);
        return { newCount: 0, error: err.message };
    }
}

let _jobCronJob = null;
function startScheduler(scraper, cronExpression = "0 2 * * *") { // Daily at 2 AM
    try {
        const cron = require("node-cron");
        if (!cron.validate(cronExpression)) {
            console.error("[JobStore] Invalid Cron:", cronExpression);
            return;
        }
        console.log(`[JobStore] Scheduler started: ${cronExpression}`);
        if (_jobCronJob) _jobCronJob.stop();
        _jobCronJob = cron.schedule(cronExpression, async () => {
            console.log(`[JobStore] Scheduled scrape started...`);
            await runScrapeAndStore(scraper);
        });
    } catch (e) {
        console.warn("[JobStore] Scheduler failed", e.message);
    }
}

async function initializeStore(scraper) {
    const meta = await getStoredMeta();
    if (!meta.hash || meta.hash === "empty") {
        console.log("[JobStore] Empty DB, initial scrape...");
        return await runScrapeAndStore(scraper);
    }
    return { hash: meta.hash };
}

module.exports = {
    getAllJobs,
    updateJobs,
    runScrapeAndStore,
    getStoredMeta,
    startScheduler,
    initializeStore
};
