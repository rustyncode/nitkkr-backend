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

    // Extract location headers (from Vercel/Cloudflare)
    // Decode URI components to handle "San%20Francisco" -> "San Francisco"
    let city = req.headers["x-vercel-ip-city"] || req.headers["cf-ipcity"] || "Unknown";
    try { city = decodeURIComponent(city); } catch (e) { /* ignore malformed URI */ }

    const country = req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"] || "Unknown";
    const region = req.headers["x-vercel-ip-country-region"] || "Unknown";
    const userAgent = req.headers["user-agent"] || "Unknown";

    // Simple device detection
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const deviceType = isMobile ? "Mobile" : "Desktop";

    // Fire-and-forget — don't block the request
    db.query(
        `INSERT INTO visitors (ip, user_agent, city, country, region, device_type, first_seen, last_seen, visit_count)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 1)
     ON CONFLICT (ip) DO UPDATE
       SET last_seen = NOW(),
           visit_count = visitors.visit_count + 1,
           user_agent = EXCLUDED.user_agent,
           city = EXCLUDED.city,
           country = EXCLUDED.country,
           region = EXCLUDED.region,
           device_type = EXCLUDED.device_type`,
        [ip, userAgent, city, country, region, deviceType]
    ).catch((err) => {
        // Silent fail — visitor tracking should never break the API
        console.warn("[VisitorTracker] Failed to log IP:", err.message);
    });

    next();
}

module.exports = visitorTracker;
