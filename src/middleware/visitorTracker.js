const db = require("../config/db");

/**
 * Middleware: tracks unique visitors by IP address.
 * On each request, upserts the visitor's IP into the `visitors` table.
 * Uses ON CONFLICT to increment visit_count and update last_seen.
 */
function visitorTracker(req, res, next) {
    // Get real IP (works behind Vercel/proxies since trust proxy is set)
    const ip =
        req.ip ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "unknown";

    // Fire-and-forget — don't block the request
    db.query(
        `INSERT INTO visitors (ip, first_seen, last_seen, visit_count)
     VALUES ($1, NOW(), NOW(), 1)
     ON CONFLICT (ip) DO UPDATE
       SET last_seen = NOW(),
           visit_count = visitors.visit_count + 1`,
        [ip]
    ).catch((err) => {
        // Silent fail — visitor tracking should never break the API
        console.warn("[VisitorTracker] Failed to log IP:", err.message);
    });

    next();
}

module.exports = visitorTracker;
