const { Pool } = require("pg");
const constants = require("../config/constants");

// Create a new pool using the connection string from env
const pool = new Pool({
    connectionString: constants.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Required for Neon (and most serverless DBs) to avoid self-signed cert errors
    },
});

// Helper to run queries
const query = (text, params) => pool.query(text, params);

// Initialize DB schema
const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Notifications Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                date TEXT,
                link TEXT,
                category TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(title, date)
            );
        `);

        // Meta Table (store hash, last scrape time)
        await client.query(`
            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value JSONB
            );
        `);

        await client.query("COMMIT");
        console.log("[DB] Schema initialized");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("[DB] Init failed", e);
        throw e;
    } finally {
        client.release();
    }
};

module.exports = {
    query,
    initDB,
    pool,
};
