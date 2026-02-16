const dataLoader = require("../utils/dataLoader");
const constants = require("../config/constants");

// ─── Search helpers ─────────────────────────────────────────

function normalizeQuery(str) {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function matchesSearch(record, query) {
  if (!query) return true;
  const normalized = normalizeQuery(query);
  const terms = normalized.split(" ");
  return terms.every((term) => record.searchText.includes(term));
}

// ─── Filter helpers ─────────────────────────────────────────

function matchesFilter(record, filters) {
  const {
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
  } = filters;

  if (department && record.department !== department) return false;
  if (deptCode && record.deptCode !== deptCode) return false;
  if (subjectCode && record.subjectCode !== subjectCode) return false;
  if (examType && record.examType !== examType) return false;
  if (category && record.category !== category) return false;
  if (catCode && record.catCode !== catCode) return false;
  if (session && record.session !== session) return false;
  if (variant && record.variant !== variant) return false;
  if (fileExtension && record.fileExtension !== fileExtension) return false;

  if (midsemNumber !== undefined && midsemNumber !== null) {
    const msNum = parseInt(midsemNumber, 10);
    if (!isNaN(msNum) && record.midsemNumber !== msNum) return false;
  }

  if (year) {
    const yearList = Array.isArray(year) ? year : year.split(",");
    if (!yearList.includes(record.year)) return false;
  }

  return true;
}

// ─── Sort helpers ───────────────────────────────────────────

const SORT_FIELDS = [
  "year",
  "subjectCode",
  "department",
  "examType",
  "uploadedAt",
  "fileSizeKB",
];

function sortRecords(records, sortBy, sortOrder) {
  const field = SORT_FIELDS.includes(sortBy) ? sortBy : "year";
  const order = sortOrder === "asc" ? 1 : -1;

  return [...records].sort((a, b) => {
    const valA = a[field] ?? "";
    const valB = b[field] ?? "";

    if (typeof valA === "number" && typeof valB === "number") {
      return (valA - valB) * order;
    }

    return String(valA).localeCompare(String(valB)) * order;
  });
}

// ─── Public API ─────────────────────────────────────────────

function getPapers({ query, filters, page, limit, sortBy, sortOrder }) {
  const allRecords = dataLoader.getRecords();

  // Step 1: Apply search
  let results = allRecords.filter((r) => matchesSearch(r, query));

  // Step 2: Apply filters
  results = results.filter((r) => matchesFilter(r, filters));

  // Step 3: Sort
  results = sortRecords(results, sortBy, sortOrder);

  // Step 4: Paginate
  const totalRecords = results.length;
  const pageSize = Math.min(
    Math.max(parseInt(limit, 10) || constants.DEFAULT_PAGE_SIZE, 1),
    constants.MAX_PAGE_SIZE
  );
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedRecords = results.slice(startIdx, endIdx);

  return {
    records: paginatedRecords,
    pagination: {
      currentPage,
      pageSize,
      totalRecords,
      totalPages,
      hasMore: currentPage < totalPages,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
    },
  };
}

function getPaperById(id) {
  const allRecords = dataLoader.getRecords();
  return allRecords.find((r) => r.id === id) || null;
}

function getFilterOptions() {
  return dataLoader.getFilterOptions();
}

function getStats() {
  const allRecords = dataLoader.getRecords();

  const countBy = (field) => {
    const counts = {};
    for (const r of allRecords) {
      const key = r[field];
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  };

  return {
    totalPapers: allRecords.length,
    byDepartment: countBy("department"),
    byYear: countBy("year"),
    byExamType: countBy("examType"),
    byCategory: countBy("category"),
    bySubjectCode: countBy("subjectCode"),
    byFileExtension: countBy("fileExtension"),
  };
}

function getSubjectCodes({ deptCode, category }) {
  const allRecords = dataLoader.getRecords();
  const seen = new Set();
  const subjects = [];

  for (const r of allRecords) {
    if (deptCode && r.deptCode !== deptCode) continue;
    if (category && r.category !== category) continue;
    if (seen.has(r.subjectCode)) continue;

    seen.add(r.subjectCode);
    subjects.push({
      subjectCode: r.subjectCode,
      subjectNumber: r.subjectNumber,
      deptCode: r.deptCode,
      department: r.department,
      catCode: r.catCode,
      category: r.category,
    });
  }

  return subjects.sort((a, b) =>
    a.subjectCode.localeCompare(b.subjectCode)
  );
}

module.exports = {
  getPapers,
  getPaperById,
  getFilterOptions,
  getStats,
  getSubjectCodes,
};
