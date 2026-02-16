const express = require("express");
const router = express.Router();
const paperController = require("../controllers/paperController");

// GET /api/papers — search, filter, paginate papers
router.get("/papers", paperController.getPapers);

// GET /api/papers/all — return all papers in one shot (for client-side caching)
router.get("/papers/all", paperController.getAllPapers);

// GET /api/papers/:id — get a single paper by ID
router.get("/papers/:id", paperController.getPaperById);

// GET /api/filters — get all available filter options
router.get("/filters", paperController.getFilterOptions);

// GET /api/stats — get aggregated statistics
router.get("/stats", paperController.getStats);

// GET /api/subjects — get subject codes (optionally filtered by dept/category)
router.get("/subjects", paperController.getSubjectCodes);

module.exports = router;
