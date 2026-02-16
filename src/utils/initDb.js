const db = require("../config/db");

async function initDb() {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      subject_code TEXT,
      dept_code TEXT,
      department TEXT,
      cat_code TEXT,
      category TEXT,
      subject_number TEXT,
      exam_type_raw TEXT,
      exam_type TEXT,
      midsem_number INTEGER,
      year TEXT,
      session TEXT,
      variant TEXT,
      detail TEXT,
      file_extension TEXT,
      original_file_name TEXT,
      file_size BIGINT,
      content_type TEXT,
      uploaded_at TIMESTAMPTZ,
      download_url TEXT,
      metadata_url TEXT,
      search_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

    const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_papers_department ON papers(department);
    CREATE INDEX IF NOT EXISTS idx_papers_subject_code ON papers(subject_code);
    CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
    CREATE INDEX IF NOT EXISTS idx_papers_exam_type ON papers(exam_type);
    CREATE INDEX IF NOT EXISTS idx_papers_search_text ON papers USING GIN (to_tsvector('english', search_text));
  `;

    try {
        console.log("[InitDB] Checking/Creating 'papers' table...");
        await db.query(createTableQuery);

        console.log("[InitDB] Checking/Creating indexes...");
        await db.query(createIndexesQuery);

        console.log("[InitDB] Database initialization successful.");
    } catch (err) {
        console.error("[InitDB] Error initializing database:", err);
        throw err; // Re-throw to handle in startup
    }
}

module.exports = initDb;
