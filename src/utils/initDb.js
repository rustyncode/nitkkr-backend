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

  const createJobsTableQuery = `
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      stipend TEXT,
      deadline TEXT,
      type TEXT,
      link TEXT NOT NULL,
      category TEXT,
      source TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const createNotificationsTableQuery = `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      date TEXT,
      link TEXT,
      category TEXT,
      source TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Unique constraint for deduplication
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uni_notif_title_date') THEN
        ALTER TABLE notifications ADD CONSTRAINT uni_notif_title_date UNIQUE (title, date);
      END IF;
    END $$;
    -- Migration: Add source column if missing
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source TEXT;
  `;

  const createMetaTableQuery = `
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
  `;

  const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_papers_department ON papers(department);
    CREATE INDEX IF NOT EXISTS idx_papers_subject_code ON papers(subject_code);
    CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
    CREATE INDEX IF NOT EXISTS idx_papers_exam_type ON papers(exam_type);
    CREATE INDEX IF NOT EXISTS idx_papers_search_text ON papers USING GIN (to_tsvector('english', search_text));
  `;

  const createJobIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
    CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
  `;

  const createNotificationIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
    CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(date);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
  `;

  try {
    console.log("[InitDB] Checking/Creating tables...");
    await db.query(createTableQuery);
    await db.query(createJobsTableQuery);
    await db.query(createNotificationsTableQuery);
    await db.query(createMetaTableQuery);

    console.log("[InitDB] Checking/Creating indexes...");
    await db.query(createIndexesQuery);
    await db.query(createJobIndexesQuery);
    await db.query(createNotificationIndexesQuery);

    console.log("[InitDB] Database initialization successful.");
  } catch (err) {
    console.error("[InitDB] Error initializing database:", err);
    throw err;
  }
}

module.exports = initDb;
