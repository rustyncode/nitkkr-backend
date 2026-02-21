const { Pool } = require("pg");
const constants = require("./constants");

// Create a new pool using the connection string from environment variables
// Strip pg-incompatible params (sslmode, channel_binding) from the URL.
// SSL is configured separately via the ssl option below.
function cleanDbUrl(url) {
    if (!url) return url;
    try {
        const u = new URL(url);
        u.searchParams.delete("sslmode");
        u.searchParams.delete("channel_binding");
        return u.toString();
    } catch {
        // Fallback: regex strip for non-standard URLs
        return url
            .replace(/[?&]sslmode=[^&]*/g, "")
            .replace(/[?&]channel_binding=[^&]*/g, "")
            .replace(/\?&/, "?")
            .replace(/[?&]$/, "");
    }
}

const pool = new Pool({
    connectionString: cleanDbUrl(constants.DATABASE_URL),
    ssl: (constants.NODE_ENV === "production" || constants.DATABASE_URL.includes("sslmode=require"))
        ? { rejectUnauthorized: false }
        : false,
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
