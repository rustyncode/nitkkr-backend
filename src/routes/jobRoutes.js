const express = require("express");
const router = express.Router();
const jobStore = require("../services/jobStore");
// Get all jobs
router.get("/jobs", async (req, res) => {
    try {
        const jobs = await jobStore.getAllJobs();
        res.json({ success: true, data: jobs });
    } catch (err) {
        console.error("[JobRoutes] Error fetching jobs:", err.message);
        res.status(500).json({ success: false, message: "Failed to fetch jobs" });
    }
});

module.exports = router;
