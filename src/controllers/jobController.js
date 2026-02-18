const jobStore = require("../services/jobStore");
const { catchAsync } = require("../middleware/errorHandler");

// GET /api/jobs — serve jobs directly from DB (no scraper)
const getJobs = catchAsync(async (req, res) => {
    const clientHash = req.query.clientHash;
    const meta = await jobStore.getStoredMeta();

    // Hash-based sync: if client already has latest data, skip transfer
    if (clientHash && clientHash === meta.hash) {
        return res.json({
            success: true,
            data: [],
            meta: {
                hasUpdates: false,
                lastFetched: meta.lastScrapedAt,
                hash: meta.hash,
            },
        });
    }

    const jobs = await jobStore.getAllJobs();

    return res.json({
        success: true,
        data: jobs,
        meta: {
            hasUpdates: true,
            hash: meta.hash,
            total: jobs.length,
            lastFetched: meta.lastScrapedAt,
        },
    });
});

module.exports = { getJobs };
