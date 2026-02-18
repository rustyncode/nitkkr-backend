const paperService = require("../services/paperService");
const { catchAsync } = require("../middleware/errorHandler");

// GET /api/papers
const getPapers = catchAsync(async (req, res) => {
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
    meta: {
      pagination: result.pagination,
    },
  });
});

// GET /api/papers/:id
const getPaperById = catchAsync(async (req, res) => {
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
});

// GET /api/filters
const getFilterOptions = catchAsync(async (req, res) => {
  const options = await paperService.getFilterOptions();
  return res.json({
    success: true,
    data: options,
  });
});

// GET /api/stats
const getStats = catchAsync(async (req, res) => {
  const stats = await paperService.getStats();
  return res.json({
    success: true,
    data: stats,
  });
});

// GET /api/subjects
const getSubjectCodes = catchAsync(async (req, res) => {
  const { deptCode, category } = req.query;
  const subjects = await paperService.getSubjectCodes({ deptCode, category });

  return res.json({
    success: true,
    data: subjects,
    meta: {
      total: subjects.length,
    },
  });
});

// GET /api/papers/all — return every paper in one shot (for client-side caching)
const getAllPapers = catchAsync(async (req, res) => {
  const clientHash = req.query.clientHash;
  const meta = await paperService.getStoredMeta();

  if (clientHash && clientHash === meta.hash) {
    return res.json({
      success: true,
      data: [],
      meta: {
        hasUpdates: false,
        hash: meta.hash,
        lastFetched: meta.lastScrapedAt,
      },
    });
  }

  const result = await paperService.getPapers({
    limit: 10000,
    page: 1
  });
  const filterOptions = await paperService.getFilterOptions();

  return res.json({
    success: true,
    data: result.records,
    meta: {
      hasUpdates: true,
      hash: meta.hash,
      total: result.pagination.totalRecords,
      filterOptions: filterOptions,
      extractedAt: meta.lastScrapedAt || new Date(),
    },
  });
});

module.exports = {
  getPapers,
  getAllPapers,
  getPaperById,
  getFilterOptions,
  getStats,
  getSubjectCodes,
};
