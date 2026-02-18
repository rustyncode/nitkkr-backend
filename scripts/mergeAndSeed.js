/**
 * mergeAndSeed.js
 * Reads existing papers_data.json, merges new entries (by paper_id),
 * writes back the full merged list, then seeds only the new ones.
 * Run: node scripts/mergeAndSeed.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.replace("sslmode=require", "")
        : undefined,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── NIT KKR Mappings ────────────────────────────────────────

const DEPT_NAMES = {
    CH: "Chemistry", PH: "Physics", MA: "Mathematics",
    HS: "Humanities & Social Sciences", ME: "Mechanical Engineering",
    CS: "Computer Engineering", IT: "Information Technology",
    EE: "Electrical Engineering", EC: "Electronics & Communication",
    CE: "Civil Engineering", AD: "Artificial Intelligence & Data Science",
    RA: "Robotics & Automation", PI: "Production & Industrial Engineering",
    DS: "Data Science", MV: "Electric Vehicle Technology",
    SE: "Software Engineering", AI: "Artificial Intelligence",
    MA: "Mathematics", SET: "Software Engineering & Technology",
};

const CAT_NAMES = {
    IC: "Integrated Course (Common)", PC: "Professional Core",
    PE: "Professional Elective", OE: "Open Elective",
    MC: "Mandatory Course", HM: "Humanities Management",
};

// ─── Helpers ─────────────────────────────────────────────────

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
        .filter(Boolean).join(" ").toLowerCase();
}

function parseSubjectCode(code) {
    if (!code) return { dept_code: null, cat_code: null, subject_number: null };
    const primary = code.split("/")[0].trim().replace(/\s+/g, "");
    let match = primary.match(/^([A-Z]{2})([A-Z]{2})[-]?(\d+.*)$/i);
    if (match) return { dept_code: match[1].toUpperCase(), cat_code: match[2].toUpperCase(), subject_number: match[3] };
    match = primary.match(/^([A-Z]+)([A-Z])[-]?(\d+.*)$/i);
    if (match) return { dept_code: match[1].toUpperCase(), cat_code: match[2].toUpperCase(), subject_number: match[3] };
    return { dept_code: primary.slice(0, 2).toUpperCase(), cat_code: null, subject_number: null };
}

function mongoIdToDate(mongoId) {
    if (!mongoId || mongoId.length < 8) return null;
    try { return new Date(parseInt(mongoId.substring(0, 8), 16) * 1000).toISOString(); } catch { return null; }
}

function deriveSession(year, sem) {
    if (!year) return null;
    const y = parseInt(year), s = parseInt(sem);
    if (isNaN(y) || isNaN(s)) return null;
    const isOdd = s % 2 !== 0;
    const nextYY = String(y + (isOdd ? 1 : 0)).slice(-2);
    const startYY = isOdd ? y : y - 1;
    const endYY = isOdd ? parseInt(nextYY) : parseInt(String(y).slice(-2));
    return `${startYY}-${String(endYY).padStart(2, "0")} ${isOdd ? "Odd" : "Even"}`;
}

function buildFileName(item) {
    const safe = (str) => (str || "").trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
    return `${safe(item.title)}_${safe(item.year)}_${safe(item.examType)}.pdf`;
}

// ─── Main ─────────────────────────────────────────────────────

async function run() {
    // 1. Read existing papers_data.json
    const dataPath = path.join(__dirname, "papers_data.json");
    const existing = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    const existingIds = new Set(existing.map(p => p.paper_id));
    console.log(`[Merge] Existing entries in file: ${existing.length}`);

    // 2. Read new_papers_data.json (the full 158 list you provided)
    const newPath = path.join(__dirname, "new_papers_data.json");
    if (!fs.existsSync(newPath)) {
        console.error("[Merge] new_papers_data.json not found! Please create it.");
        process.exit(1);
    }
    const allNew = JSON.parse(fs.readFileSync(newPath, "utf8"));
    console.log(`[Merge] Total entries in new file: ${allNew.length}`);

    // 3. Filter only truly new entries
    const toAdd = allNew.filter(p => !existingIds.has(p.paper_id));
    console.log(`[Merge] New entries to add: ${toAdd.length}`);

    if (toAdd.length === 0) {
        console.log("[Merge] Nothing new to add.");
        await pool.end();
        return;
    }

    // 4. Merge and write back
    const merged = [...existing, ...toAdd];
    fs.writeFileSync(dataPath, JSON.stringify(merged, null, 4));
    console.log(`[Merge] papers_data.json updated. Total: ${merged.length}`);

    // 5. Seed only the new entries
    const client = await pool.connect();
    let inserted = 0, skipped = 0;

    try {
        for (const item of toAdd) {
            const id = item.paper_id;
            const subjectCode = (item.subjectCode || "").trim();
            const examTypeRaw = (item.examType || "").trim();
            const { dept_code, cat_code, subject_number } = parseSubjectCode(subjectCode);

            const values = [
                id, subjectCode, dept_code,
                DEPT_NAMES[dept_code] || (item.subject || "").trim(),
                cat_code, CAT_NAMES[cat_code] || null, subject_number,
                examTypeRaw, normalizeExamType(examTypeRaw), extractMidsemNumber(examTypeRaw),
                (item.year || "").trim(), deriveSession(item.year, item.sem),
                null, (item.title || "").trim(), "pdf", buildFileName(item),
                null, "application/pdf", mongoIdToDate(item._id),
                (item.paper_url || "").trim(), null, buildSearchText(item),
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
            subject_code = EXCLUDED.subject_code, dept_code = EXCLUDED.dept_code,
            department = EXCLUDED.department, cat_code = EXCLUDED.cat_code,
            category = EXCLUDED.category, subject_number = EXCLUDED.subject_number,
            exam_type_raw = EXCLUDED.exam_type_raw, exam_type = EXCLUDED.exam_type,
            midsem_number = EXCLUDED.midsem_number, year = EXCLUDED.year,
            session = EXCLUDED.session, detail = EXCLUDED.detail,
            download_url = EXCLUDED.download_url, search_text = EXCLUDED.search_text,
            updated_at = NOW()`,
                    values
                );
                inserted++;
            } catch (err) {
                console.warn(`[Seed] Failed ${id}: ${err.message}`);
                skipped++;
            }
        }
        console.log(`[Seed] Done. Inserted: ${inserted}, Errors: ${skipped}`);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => { console.error("[Fatal]", err); process.exit(1); });
