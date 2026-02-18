const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");

// ── Public endpoints ──────────────────────────────────────────

// GET /api/jobs — all active jobs from DB
router.get("/jobs", jobController.getJobs);

module.exports = router;
