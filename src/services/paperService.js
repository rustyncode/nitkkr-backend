const db = require("../config/db");
const constants = require("../config/constants");

// ─── Search helpers ─────────────────────────────────────────

function normalizeQuery(str) {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

// ─── Filter helpers ─────────────────────────────────────────

function buildWhereClause(filters = {}, query) {
  const conditions = [];
  const values = [];
  let paramIdx = 1;

  // Search Query (Full Text Search)
  if (query) {
    const normalized = normalizeQuery(query);
    // Use Postgres Full-Text Search operator @@
    // Values are passed as plainto_tsquery for natural language search
    conditions.push(`to_tsvector('english', search_text) @@ plainto_tsquery('english', $${paramIdx++})`);
    values.push(normalized);
  }

  // Exact filters
  if (filters.department) {
    conditions.push(`department = $${paramIdx++}`);
    values.push(filters.department);
  }
  if (filters.deptCode) {
    conditions.push(`dept_code = $${paramIdx++}`);
    values.push(filters.deptCode);
  }
  if (filters.subjectCode) {
    conditions.push(`subject_code = $${paramIdx++}`);
    values.push(filters.subjectCode);
  }
  if (filters.examType) {
    conditions.push(`exam_type = $${paramIdx++}`);
    values.push(filters.examType);
  }
  if (filters.category) {
    conditions.push(`category = $${paramIdx++}`);
    values.push(filters.category);
  }
  if (filters.catCode) {
    conditions.push(`cat_code = $${paramIdx++}`);
    values.push(filters.catCode);
  }
  if (filters.session) {
    conditions.push(`session = $${paramIdx++}`);
    values.push(filters.session);
  }
  if (filters.variant) {
    conditions.push(`variant = $${paramIdx++}`);
    values.push(filters.variant);
  }
  if (filters.fileExtension) {
    conditions.push(`file_extension = $${paramIdx++}`);
    values.push(filters.fileExtension);
  }

  if (filters.midsemNumber !== undefined && filters.midsemNumber !== null) {
    const msNum = parseInt(filters.midsemNumber, 10);
    if (!isNaN(msNum)) {
      conditions.push(`midsem_number = $${paramIdx++}`);
      values.push(msNum);
    }
  }

  if (filters.year) {
    const yearList = Array.isArray(filters.year) ? filters.year : filters.year.split(",");
    if (yearList.length > 0) {
      conditions.push(`year = ANY($${paramIdx++}::text[])`);
      values.push(yearList);
    }
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
    nextParamIdx: paramIdx,
  };
}

// ─── Public API ─────────────────────────────────────────────

async function getPapers({ query, filters = {}, page, limit, sortBy, sortOrder }) {
  const { where, values } = buildWhereClause(filters, query);

  // Sorting
  const validSortFields = {
    year: "year",
    subjectCode: "subject_code",
    department: "department",
    examType: "exam_type",
    uploadedAt: "uploaded_at",
    fileSizeKB: "file_size",
  };

  // If there's a search query, default to relevance (rank) unless otherwise specified
  // Otherwise default to year
  let sortField = validSortFields[sortBy] || (query ? "rank" : "year");
  const direction = sortOrder === "asc" ? "ASC" : "DESC";

  // Pagination
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(limit, 10) || constants.DEFAULT_PAGE_SIZE, 1),
    constants.MAX_PAGE_SIZE
  );
  const offset = (pageNum - 1) * pageSize;

  // Count Query
  const countQuery = `SELECT COUNT(*) FROM papers ${where}`;
  const countRes = await db.query(countQuery, values);
  const totalRecords = parseInt(countRes.rows[0].count, 10);

  // Data Query
  // We include ts_rank_cd to sort by relevance if needed
  const dataQuery = `
    SELECT 
      id, subject_code as "subjectCode", dept_code as "deptCode", department, 
      category, exam_type as "examType", 
      midsem_number as "midsemNumber", year, session, variant, detail,
      subject_name as "subjectName",
      file_extension as "fileExtension", original_file_name as "originalFileName",
      file_size as "fileSize", uploaded_at as "uploadedAt", 
      download_url as "downloadUrl"
      ${query ? `, ts_rank_cd(to_tsvector('english', search_text), plainto_tsquery('english', $${values.length + 1})) as rank` : ""}
    FROM papers
    ${where}
    ORDER BY ${sortField} ${direction}
    LIMIT $${query ? values.length + 2 : values.length + 1} OFFSET $${query ? values.length + 3 : values.length + 2}
  `;

  const queryParams = query ? [...values, normalizeQuery(query), pageSize, offset] : [...values, pageSize, offset];
  const dataRes = await db.query(dataQuery, queryParams);

  const totalPages = Math.ceil(totalRecords / pageSize);

  return {
    records: dataRes.rows,
    pagination: {
      currentPage: pageNum,
      pageSize,
      totalRecords,
      totalPages,
      hasMore: pageNum < totalPages,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    },
  };
}

async function getPaperById(id) {
  const query = `
    SELECT 
      id, subject_code as "subjectCode", dept_code as "deptCode", department, 
      category, exam_type as "examType", 
      midsem_number as "midsemNumber", year, session, variant, detail,
      subject_name as "subjectName",
      file_extension as "fileExtension", original_file_name as "originalFileName",
      file_size as "fileSize", uploaded_at as "uploadedAt", 
      download_url as "downloadUrl"
    FROM papers
    WHERE id = $1
  `;
  const res = await db.query(query, [id]);
  return res.rows[0] || null;
}

async function getFilterOptions() {
  // We can cache this or query distinct values
  // For now, executing distinct queries in parallel for performance
  const queries = {
    departments: 'SELECT DISTINCT department FROM papers WHERE department IS NOT NULL ORDER BY department',
    years: 'SELECT DISTINCT year FROM papers WHERE year IS NOT NULL ORDER BY year DESC',
    examTypes: 'SELECT DISTINCT exam_type as "examType" FROM papers WHERE exam_type IS NOT NULL ORDER BY exam_type',
    categories: 'SELECT DISTINCT category FROM papers WHERE category IS NOT NULL ORDER BY category',
    subjects: 'SELECT DISTINCT subject_code as "subjectCode" FROM papers WHERE subject_code IS NOT NULL ORDER BY subject_code'
  };

  const results = {};
  await Promise.all(
    Object.entries(queries).map(async ([key, sql]) => {
      const res = await db.query(sql);
      results[key] = res.rows.map(row => row[Object.keys(row)[0]]);
    })
  );

  return results;
}

async function getStats() {
  const countBy = async (field, alias) => {
    const sql = `SELECT ${field} as key, COUNT(*) as count FROM papers WHERE ${field} IS NOT NULL GROUP BY ${field}`;
    const res = await db.query(sql);
    return res.rows.reduce((acc, row) => ({ ...acc, [row.key]: parseInt(row.count, 10) }), {});
  };

  const totalRes = await db.query('SELECT COUNT(*) FROM papers');

  const [byDept, byYear, byExam, byCat, bySub, byExt] = await Promise.all([
    countBy('department'),
    countBy('year'),
    countBy('exam_type'),
    countBy('category'),
    countBy('subject_code'),
    countBy('file_extension')
  ]);

  return {
    totalPapers: parseInt(totalRes.rows[0].count, 10),
    byDepartment: byDept,
    byYear: byYear,
    byExamType: byExam,
    byCategory: byCat,
    bySubjectCode: bySub,
    byFileExtension: byExt,
  };
}

async function getSubjectCodes({ deptCode, category }) {
  let where = "";
  const params = [];
  if (deptCode) {
    where = "WHERE dept_code = $1";
    params.push(deptCode);
  }
  if (category) {
    where = where ? `${where} AND category = $${params.length + 1}` : `WHERE category = $${params.length + 1}`;
    params.push(category);
  }

  const query = `
    SELECT DISTINCT
      subject_code as "subjectCode",
      dept_code as "deptCode",
      department,
      category
    FROM papers
    ${where}
    ORDER BY "subjectCode"
  `;

  const res = await db.query(query, params);
  return res.rows;
}

async function getStoredMeta() {
  try {
    const res = await db.query("SELECT value FROM meta WHERE key = $1", ["paper_meta"]);
    if (res.rows.length > 0) return res.rows[0].value;

    // Fallback: If no meta, generate a simple hash based on count/max date
    const countRes = await db.query("SELECT COUNT(*), MAX(uploaded_at) as max_date FROM papers");
    const count = countRes.rows[0].count;
    const maxDate = countRes.rows[0].max_date || "none";
    const crypto = require("crypto");
    const hash = crypto.createHash("md5").update(`${count}|${maxDate}`).digest("hex").slice(0, 16);
    return { hash, lastScrapedAt: new Date().toISOString() };
  } catch (err) {
    return { hash: "paper-default" };
  }
}

module.exports = {
  getPapers,
  getPaperById,
  getFilterOptions,
  getStats,
  getSubjectCodes,
  getStoredMeta
};
