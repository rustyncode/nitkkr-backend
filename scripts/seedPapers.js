/**
 * Seed script: Insert papers from JSON into PostgreSQL
 * Run: node scripts/seedPapers.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.replace("sslmode=require", "")
        : undefined,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── NIT KKR Mappings ────────────────────────────────────────

const DEPT_NAMES = {
    CH: "Chemistry",
    PH: "Physics",
    MA: "Mathematics",
    HS: "Humanities & Social Sciences",
    ME: "Mechanical Engineering",
    CS: "Computer Engineering",
    IT: "Information Technology",
    EE: "Electrical Engineering",
    EC: "Electronics & Communication",
    CE: "Civil Engineering",
    AD: "Artificial Intelligence & Data Science",
    RA: "Robotics & Automation",
    PI: "Production & Industrial Engineering",
    DS: "Data Science",
    MV: "Electric Vehicle Technology",
    SE: "Software Engineering",
};

const CAT_NAMES = {
    IC: "Integrated Course (Common)",
    PC: "Professional Core",
    PE: "Professional Elective",
    OE: "Open Elective",
    MC: "Mandatory Course",
    HM: "Humanities Management",
};

// ─── Field mapping helpers ───────────────────────────────────

function normalizeExamType(raw) {
    if (!raw) return null;
    const lower = raw.toLowerCase().trim();
    if (lower === "mid-1") return "Mid-Sem 1";
    if (lower === "mid-2") return "Mid-Sem 2";
    if (lower === "sem") return "End-Sem";
    return raw;
}

function extractMidsemNumber(raw) {
    if (!raw) return null;
    if (raw.toLowerCase() === "mid-1") return 1;
    if (raw.toLowerCase() === "mid-2") return 2;
    return null;
}

function buildSearchText(item) {
    return [item.title, item.subject, item.subjectCode, item.year, item.examType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

// e.g. "CHIC-101" -> dept="CH", cat="IC", num="101"
function parseSubjectCode(code) {
    if (!code) return { dept_code: null, cat_code: null, subject_number: null };
    const primary = code.split("/")[0].trim().replace(/\s+/g, "");

    // Try matching standard [Dept(2)][Cat(2)]-[Num(3)]
    let match = primary.match(/^([A-Z]{2})([A-Z]{2})[-]?(\d+.*)$/i);
    if (match) {
        return {
            dept_code: match[1].toUpperCase(),
            cat_code: match[2].toUpperCase(),
            subject_number: match[3],
        };
    }

    // Fallback for codes like "CHI C-101" or irregular ones
    match = primary.match(/^([A-Z]+)([A-Z])[-]?(\d+.*)$/i);
    if (match) {
        return {
            dept_code: match[1].toUpperCase(),
            cat_code: match[2].toUpperCase(),
            subject_number: match[3],
        };
    }

    return { dept_code: primary.slice(0, 2).toUpperCase(), cat_code: null, subject_number: null };
}

// Extract timestamp from MongoDB ObjectId
function mongoIdToDate(mongoId) {
    if (!mongoId || mongoId.length < 8) return null;
    try {
        const hex = mongoId.substring(0, 8);
        return new Date(parseInt(hex, 16) * 1000).toISOString();
    } catch {
        return null;
    }
}

// Derive academic session
function deriveSession(year, sem) {
    if (!year) return null;
    const y = parseInt(year);
    const s = parseInt(sem);
    if (isNaN(y) || isNaN(s)) return null;
    const isOdd = s % 2 !== 0;
    const nextYY = String(y + (isOdd ? 1 : 0)).slice(-2);
    const startYY = isOdd ? y : y - 1;
    const endYY = isOdd ? parseInt(nextYY) : parseInt(String(y).slice(-2));
    return `${startYY}-${String(endYY).padStart(2, "0")} ${isOdd ? "Odd" : "Even"}`;
}

// Build a clean filename
function buildFileName(item) {
    const safe = (str) => (str || "").trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
    return `${safe(item.title)}_${safe(item.year)}_${safe(item.examType)}.pdf`;
}

// ─── Load JSON data ──────────────────────────────────────────

const papers = require("./papers_data.json");

// ─── Seed function ───────────────────────────────────────────

async function seed() {
    const client = await pool.connect();
    let inserted = 0;
    let skipped = 0;

    try {
        console.log(`[Seed] Starting to seed ${papers.length} papers...`);

        for (const item of papers) {
            const id = item.paper_id;
            const subjectCode = (item.subjectCode || "").trim();
            const examTypeRaw = (item.examType || "").trim();
            const { dept_code, cat_code, subject_number } = parseSubjectCode(subjectCode);

            const values = [
                id,                                       // id
                subjectCode,                              // subject_code
                dept_code,                                // dept_code
                DEPT_NAMES[dept_code] || (item.subject || "").trim(), // department name
                cat_code,                                 // cat_code
                CAT_NAMES[cat_code] || null,              // category name
                subject_number,                           // subject_number
                examTypeRaw,                              // exam_type_raw
                normalizeExamType(examTypeRaw),           // exam_type
                extractMidsemNumber(examTypeRaw),         // midsem_number
                (item.year || "").trim(),                 // year
                deriveSession(item.year, item.sem),       // session
                null,                                     // variant
                (item.title || "").trim(),                // detail
                "pdf",                                    // file_extension
                buildFileName(item),                      // original_file_name
                null,                                     // file_size
                "application/pdf",                        // content_type
                mongoIdToDate(item._id),                  // uploaded_at
                (item.paper_url || "").trim(),            // download_url
                null,                                     // metadata_url
                buildSearchText(item),                    // search_text
            ];

            try {
                await client.query(
                    `INSERT INTO papers (
            id, subject_code, dept_code, department, cat_code, category,
            subject_number, exam_type_raw, exam_type, midsem_number,
            year, session, variant, detail, file_extension, original_file_name,
            file_size, content_type, uploaded_at, download_url, metadata_url, search_text
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
          ) ON CONFLICT (id) DO UPDATE SET
            subject_code = EXCLUDED.subject_code,
            dept_code = EXCLUDED.dept_code,
            department = EXCLUDED.department,
            cat_code = EXCLUDED.cat_code,
            category = EXCLUDED.category,
            subject_number = EXCLUDED.subject_number,
            exam_type_raw = EXCLUDED.exam_type_raw,
            exam_type = EXCLUDED.exam_type,
            midsem_number = EXCLUDED.midsem_number,
            year = EXCLUDED.year,
            session = EXCLUDED.session,
            detail = EXCLUDED.detail,
            download_url = EXCLUDED.download_url,
            search_text = EXCLUDED.search_text,
            updated_at = NOW();`,
                    values
                );
                inserted++;
            } catch (err) {
                console.warn(`[Seed] Failed to insert ${id}: ${err.message}`);
                skipped++;
            }
        }

        console.log(`[Seed] Done. Processed: ${inserted}, Errors: ${skipped}`);
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch((err) => {
    console.error("[Seed] Fatal error:", err);
    process.exit(1);
});
