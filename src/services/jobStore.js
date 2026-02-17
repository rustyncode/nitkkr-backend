const db = require("../config/db");

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

async function updateJobs(freshJobs) {
    if (!freshJobs || !Array.isArray(freshJobs)) return { newCount: 0 };

    let newCount = 0;
    const client = await db.pool.connect();

    try {
        await client.query("BEGIN");

        // Deactivate old jobs from the same sources to keep it fresh
        // Or just mark them as inactive if they are not in the fresh list
        // For now, let's just insert new ones and maybe clear old ones later

        for (const job of freshJobs) {
            console.log(`[JobStore] Checking job: ${job.title} from ${job.source}`);
            // Check for duplicates based on title, company, and source
            const checkRes = await client.query(
                "SELECT id FROM jobs WHERE title = $1 AND company = $2 AND source = $3 AND is_active = TRUE",
                [job.title, job.company, job.source]
            );

            if (checkRes.rows.length === 0) {
                await client.query(
                    `INSERT INTO jobs (title, company, location, stipend, deadline, type, link, category, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        job.title,
                        job.company,
                        job.location,
                        job.stipend,
                        job.deadline,
                        job.type,
                        job.link,
                        job.category,
                        job.source
                    ]
                );
                newCount++;
            }
        }

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

module.exports = {
    getAllJobs,
    updateJobs,
    runScrapeAndStore
};
