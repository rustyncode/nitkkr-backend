const paperService = require("../services/paperService");
const dataLoader = require("../utils/dataLoader");

// GET /api/papers
function getPapers(req, res) {
  try {
    const {
      q,
      department,
      deptCode,
      subjectCode,
      examType,
      midsemNumber,
      year,
      category,
      catCode,
      session,
      variant,
      fileExtension,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const filters = {
      department,
      deptCode,
      subjectCode,
      examType,
      midsemNumber,
      year,
      category,
      catCode,
      session,
      variant,
      fileExtension,
    };

    const result = paperService.getPapers({
      query: q,
      filters,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return res.json({
      success: true,
      data: result.records,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("[PaperController] getPapers error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch papers",
      error: err.message,
    });
  }
}

// GET /api/papers/:id
function getPaperById(req, res) {
  try {
    const { id } = req.params;
    const paper = paperService.getPaperById(id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: "Paper not found",
      });
    }

    return res.json({
      success: true,
      data: paper,
    });
  } catch (err) {
    console.error("[PaperController] getPaperById error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch paper",
      error: err.message,
    });
  }
}

// GET /api/filters
function getFilterOptions(req, res) {
  try {
    const options = paperService.getFilterOptions();

    return res.json({
      success: true,
      data: options,
    });
  } catch (err) {
    console.error("[PaperController] getFilterOptions error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch filter options",
      error: err.message,
    });
  }
}

// GET /api/stats
function getStats(req, res) {
  try {
    const stats = paperService.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("[PaperController] getStats error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: err.message,
    });
  }
}

// GET /api/subjects
function getSubjectCodes(req, res) {
  try {
    const { deptCode, category } = req.query;
    const subjects = paperService.getSubjectCodes({ deptCode, category });

    return res.json({
      success: true,
      data: subjects,
      total: subjects.length,
    });
  } catch (err) {
    console.error("[PaperController] getSubjectCodes error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subject codes",
      error: err.message,
    });
  }
}

// GET /api/papers/all — return every paper in one shot (for client-side caching)
function getAllPapers(req, res) {
  try {
    const records = dataLoader.getRecords();
    const meta = dataLoader.getMeta();
    const filterOptions = dataLoader.getFilterOptions();

    return res.json({
      success: true,
      data: records,
      total: records.length,
      filterOptions: filterOptions,
      extractedAt: meta.extractedAt || null,
    });
  } catch (err) {
    console.error("[PaperController] getAllPapers error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all papers",
      error: err.message,
    });
  }
}

module.exports = {
  getPapers,
  getAllPapers,
  getPaperById,
  getFilterOptions,
  getStats,
  getSubjectCodes,
};
