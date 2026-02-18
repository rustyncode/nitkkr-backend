/**
 * Admin authentication middleware.
 * Protects destructive/admin-only endpoints.
 *
 * Usage: router.post("/refresh", adminAuth, controller.refresh)
 *
 * Set ADMIN_SECRET in your .env / Vercel environment variables.
 * Pass the key via: x-admin-key: <secret>
 */
function adminAuth(req, res, next) {
    const secret = process.env.ADMIN_SECRET;

    // If no secret is configured, block all access in production
    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            return res.status(503).json({
                success: false,
                message: "Admin endpoints are not configured.",
            });
        }
        // In dev, allow through with a warning
        console.warn("[AdminAuth] ADMIN_SECRET not set — skipping auth in dev mode");
        return next();
    }

    const provided = req.headers["x-admin-key"];

    if (!provided || provided !== secret) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Invalid or missing admin key.",
        });
    }

    next();
}

module.exports = adminAuth;
