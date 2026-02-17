const jobStore = require("../services/jobStore");

// GET /api/jobs
async function getJobs(req, res) {
    try {
        const clientHash = req.query.clientHash;
        const meta = await jobStore.getStoredMeta();

        if (clientHash && clientHash === meta.hash) {
            return res.json({
                success: true,
                hasUpdates: false,
                lastFetched: meta.lastScrapedAt,
            });
        }

        const jobs = await jobStore.getAllJobs();

        return res.json({
            success: true,
            hasUpdates: true,
            data: jobs,
            hash: meta.hash,
            total: jobs.length,
            lastFetched: meta.lastScrapedAt,
        });
    } catch (err) {
        console.error("[JobController] getJobs error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch jobs",
            error: err.message,
        });
    }
}

// POST /api/jobs/refresh
async function refreshJobs(req, res) {
    try {
        const scraper = require("../scrapers/jobScraper");
        const result = await jobStore.runScrapeAndStore(scraper);

        return res.json({
            success: true,
            message: "Jobs refreshed from source",
            newCount: result.newCount,
            lastFetched: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[JobController] refreshJobs error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Failed to refresh jobs",
            error: err.message,
        });
    }
}

module.exports = {
    getJobs,
    refreshJobs,
};
