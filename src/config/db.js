const { Pool } = require("pg");
const constants = require("./constants");

// Create a new pool using the connection string from environment variables
// Strip sslmode param cleanly from the connection URL to avoid pg v9 SSL deprecation warning
function cleanDbUrl(url) {
    if (!url) return url;
    try {
        const u = new URL(url);
        u.searchParams.delete("sslmode");
        return u.toString();
    } catch {
        // Fallback: regex strip for non-standard URLs
        return url.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?&/, "?").replace(/[?&]$/, "");
    }
}

const pool = new Pool({
    connectionString: cleanDbUrl(constants.DATABASE_URL),
    ssl: constants.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 20, // Max number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Helper for running queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // console.log("executed query", { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error("Error executing query", { text, err });
        throw err;
    }
};

// Check connection
pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});

module.exports = {
    query,
    pool,
};
