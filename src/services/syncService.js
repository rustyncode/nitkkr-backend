const db = require("../config/db");
const constants = require("../config/constants");

/**
 * Parses a file name into metadata fields.
 * Extracts department, category, exam type, and other metadata from standardized file naming convention.
 */

const path = require("path");
const { DEPT_MAP, CATEGORY_MAP } = require("../config/mappings");

function parseFileName(name) {
    const ext = path.extname(name).replace(".", "").toLowerCase();
    const parts = name.split("-");

    let subjectCode = "";
    let examTypeRaw = "";
    let year = "";
    let detail = "";

    if (parts.length >= 4) {
        subjectCode = parts[0].trim();
        examTypeRaw = parts[1].trim();
        year = parts[2].trim();
        detail = parts.slice(3).join("-").replace(/\.[^.]+$/, "").trim();
    } else if (parts.length === 3) {
        subjectCode = parts[0].trim();
        examTypeRaw = parts[1].trim();
        year = parts[2].replace(/\.[^.]+$/, "").trim();
    }

    // Department
    const deptCode = subjectCode.match(/^([A-Z]{2})/)?.[1] || "";
    const department = DEPT_MAP[deptCode] || deptCode;

    // Category
    const catCode = subjectCode.match(/^[A-Z]{2}([A-Z]{2})/)?.[1] || "";
    const category = CATEGORY_MAP[catCode] || catCode;

    // Subject number
    const subjectNumber = subjectCode.match(/^[A-Z]{4}(\d+)/)?.[1] || "";

    // Exam Type
    let examType = "";
    let midsemNumber = null;
    const etNorm = examTypeRaw.toUpperCase().replace(/\s+/g, "");

    if (etNorm === "ES" || etNorm === "E") {
        examType = "End Semester";
    } else if (etNorm === "MS" || etNorm === "M") {
        examType = "Mid Semester";
    } else if (etNorm === "MS1") {
        examType = "Mid Semester";
        midsemNumber = 1;
    } else if (etNorm === "MS2") {
        examType = "Mid Semester";
        midsemNumber = 2;
    } else {
        examType = examTypeRaw;
    }

    if (examType === "Mid Semester" && midsemNumber === null) {
        const msMatch = detail.match(/MS(\d)/i);
        if (msMatch) midsemNumber = parseInt(msMatch[1], 10);
    }

    // Session
    let session = null;
    const sessionPatterns = [/Dec/i, /May/i, /Jun/i, /Jan/i, /Mar/i, /Nov/i, /Oct/i, /Morning/i, /Evening/i, /Reappear/i];
    for (const pat of sessionPatterns) {
        const m = detail.match(pat);
        if (m) {
            session = m[0];
            break;
        }
    }

    // Variant
    let variant = null;
    const branchMatch = detail.match(/\(([^)]+)\)/);
    if (branchMatch) variant = branchMatch[1];

    // Search Text
    const searchText = [
        subjectCode,
        department,
        category,
        examType,
        midsemNumber ? `MS${midsemNumber}` : "",
        year,
        session,
        variant,
        detail,
    ].filter(Boolean).join(" ").toLowerCase();

    return {
        subjectCode,
        deptCode,
        department,
        catCode,
        category,
        subjectNumber,
        examTypeRaw,
        examType,
        midsemNumber,
        year: year || null,
        session,
        variant,
        detail,
        fileExtension: ext,
        originalFileName: name,
        searchText,
        subjectName: detail, // Fallback to detail for now, or map here
    };
}

const STORAGE_API = constants.STORAGE_API_URL;
const https = require("https");

function fetch(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return fetch(res.headers.location).then(resolve).catch(reject);
                }
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => {
                    const body = Buffer.concat(chunks).toString("utf-8");
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(body);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
                    }
                });
                res.on("error", reject);
            })
            .on("error", reject);
    });
}

async function fetchJSON(url) {
    const body = await fetch(url);
    return JSON.parse(body);
}

async function fetchFileMeta(fileName) {
    const url = `${STORAGE_API}/${encodeURIComponent(fileName)}`;
    try {
        const meta = await fetchJSON(url);
        return {
            size: meta.size ? Number(meta.size) : null,
            contentType: meta.contentType || null,
            created: meta.timeCreated || null,
            updated: meta.updated || null,
            md5: meta.md5Hash || null,
        };
    } catch {
        return { size: null, created: null };
    }
}

async function runPool(tasks, concurrency) {
    const results = [];
    let idx = 0;
    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            results[i] = await tasks[i]();
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

async function syncPapers() {
    console.log("[SyncService] Starting paper synchronization...");
    try {
        let allItems = [];
        let pageToken = null;

        // 1. List files from Firebase Storage
        do {
            let url = STORAGE_API;
            const params = ["maxResults=1000"];
            if (pageToken) params.push(`pageToken=${encodeURIComponent(pageToken)}`);
            url += "?" + params.join("&");

            const data = await fetchJSON(url);
            if (data.items) allItems = allItems.concat(data.items);
            pageToken = data.nextPageToken || null;
        } while (pageToken);

        console.log(`[SyncService] Found ${allItems.length} files. Fetching metadata...`);

        // 2. Fetch metadata (parallel)
        const fileMetas = [];
        const metaTasks = allItems.map((item, i) => async () => {
            fileMetas[i] = await fetchFileMeta(item.name);
        });

        await runPool(metaTasks, 20);

        // 3. Process and Upsert logic
        console.log("[SyncService] Processing and upserting records...");

        // We'll use a transaction for batch insertion or individually upsert
        // Given the volume (likely < 10k), individual upserts or batched upserts are fine.
        // For simplicity and error isolation, let's do batch upserts of 50.

        const records = allItems.map((item, i) => {
            const parsed = parseFileName(item.name);
            const meta = fileMetas[i];
            // Use filename as stable ID since all files in bucket have unique names
            const stableId = item.name;

            return {
                id: stableId,
                ...parsed,
                fileSize: meta.size,
                contentType: meta.contentType,
                uploadedAt: meta.created,
                downloadUrl: `${STORAGE_API}/${encodeURIComponent(item.name)}?alt=media`,
                metadataUrl: `${STORAGE_API}/${encodeURIComponent(item.name)}`,
            };
        });

        let upsertCount = 0;

        // Batch upsert function
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            const queryText = `
        INSERT INTO papers (
          id, subject_code, dept_code, department, cat_code, category, subject_number,
          exam_type_raw, exam_type, midsem_number, year, session, variant, detail,
          file_extension, original_file_name, file_size, content_type, uploaded_at,
          download_url, metadata_url, subject_name, search_text, updated_at
        ) VALUES 
        ${batch.map((_, idx) => `($${idx * 23 + 1}, $${idx * 23 + 2}, $${idx * 23 + 3}, $${idx * 23 + 4}, $${idx * 23 + 5}, $${idx * 23 + 6}, $${idx * 23 + 7}, $${idx * 23 + 8}, $${idx * 23 + 9}, $${idx * 23 + 10}, $${idx * 23 + 11}, $${idx * 23 + 12}, $${idx * 23 + 13}, $${idx * 23 + 14}, $${idx * 23 + 15}, $${idx * 23 + 16}, $${idx * 23 + 17}, $${idx * 23 + 18}, $${idx * 23 + 19}, $${idx * 23 + 20}, $${idx * 23 + 21}, $${idx * 23 + 22}, $${idx * 23 + 23}, NOW())`).join(", ")}
        ON CONFLICT (id) DO UPDATE SET
          department = EXCLUDED.department,
          exam_type = EXCLUDED.exam_type,
          download_url = EXCLUDED.download_url,
          subject_name = EXCLUDED.subject_name,
          search_text = EXCLUDED.search_text,
          updated_at = NOW();
      `;

            const values = batch.flatMap(r => [
                r.id, r.subjectCode, r.deptCode, r.department, r.catCode, r.category, r.subjectNumber,
                r.examTypeRaw, r.examType, r.midsemNumber, r.year, r.session, r.variant, r.detail,
                r.fileExtension, r.originalFileName, r.fileSize, r.contentType, r.uploadedAt,
                r.downloadUrl, r.metadataUrl, r.subjectName, r.searchText
            ]);

            await db.query(queryText, values);
            upsertCount += batch.length;
        }

        console.log(`[SyncService] Successfully synced ${upsertCount} records.`);
        return { success: true, count: upsertCount };

    } catch (err) {
        console.error("[SyncService] Error during sync:", err);
        return { success: false, error: err.message };
    }
}

module.exports = {
    syncPapers,
};
