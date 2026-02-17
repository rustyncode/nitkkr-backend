const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");

// Get all jobs
router.get("/jobs", jobController.getJobs);
router.post("/jobs/refresh", jobController.refreshJobs);

module.exports = router;
