const fs = require("fs");
const constants = require("../config/constants");

let cachedData = null;
let cachedMeta = null;

function loadData() {
  if (cachedData) {
    return { records: cachedData, meta: cachedMeta };
  }

  try {
    const raw = fs.readFileSync(constants.DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    cachedData = parsed.records || [];
    cachedMeta = parsed._meta || {};

    console.log(`[DataLoader] Loaded ${cachedData.length} records from disk`);

    return { records: cachedData, meta: cachedMeta };
  } catch (err) {
    console.error(`[DataLoader] Failed to load data: ${err.message}`);
    cachedData = [];
    cachedMeta = {};
    return { records: cachedData, meta: cachedMeta };
  }
}

function getRecords() {
  const { records } = loadData();
  return records;
}

function getMeta() {
  const { meta } = loadData();
  return meta;
}

function getFilterOptions() {
  const meta = getMeta();
  return meta.filterOptions || {};
}

function invalidateCache() {
  cachedData = null;
  cachedMeta = null;
  console.log("[DataLoader] Cache invalidated");
}

module.exports = {
  loadData,
  getRecords,
  getMeta,
  getFilterOptions,
  invalidateCache,
};
