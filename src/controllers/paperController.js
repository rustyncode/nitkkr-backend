const paperService = require("../services/paperService");
// dataLoader is removed

// GET /api/papers
async function getPapers(req, res) {
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

    const result = await paperService.getPapers({
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
async function getPaperById(req, res) {
  try {
    const { id } = req.params;
    const paper = await paperService.getPaperById(id);

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
async function getFilterOptions(req, res) {
  try {
    const options = await paperService.getFilterOptions();

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
async function getStats(req, res) {
  try {
    const stats = await paperService.getStats();

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
async function getSubjectCodes(req, res) {
  try {
    const { deptCode, category } = req.query;
    const subjects = await paperService.getSubjectCodes({ deptCode, category });

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
async function getAllPapers(req, res) {
  try {
    // Fetch all papers without pagination (high limit)
    // NOTE: This might be heavy for DB if thousands of records.
    // For now, mirroring previous behavior.
    const result = await paperService.getPapers({
      limit: 10000,
      page: 1
    });
    const filterOptions = await paperService.getFilterOptions();

    return res.json({
      success: true,
      data: result.records,
      total: result.pagination.totalRecords,
      filterOptions: filterOptions,
      extractedAt: new Date(), // DB doesn't have a single extraction time, returning now()
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
