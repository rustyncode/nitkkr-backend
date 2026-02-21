const admin = require("../config/firebase");

/**
 * Middleware to verify Firebase ID Token and ensure domain is @nitkkr.ac.in
 */
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: "Authorization header missing or invalid",
        });
    }

    const idToken = authHeader.split(" ")[1];

    // --- Testing Bypass (Dev Only) ---
    if (process.env.NODE_ENV !== "production" && idToken.startsWith("mock-token-")) {
        const rollNumber = idToken.replace("mock-token-", "");
        console.log(`[Auth] Using mock token for roll: ${rollNumber}`);
        req.user = {
            uid: `mock-uid-${rollNumber}`,
            email: `${rollNumber}@nitkkr.ac.in`,
            roll_number: rollNumber,
        };
        return next();
    }
    // --------------------------------

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Domain Check
        if (!decodedToken.email || !decodedToken.email.endsWith("@nitkkr.ac.in")) {
            return res.status(403).json({
                success: false,
                error: "Access restricted to @nitkkr.ac.in email addresses",
            });
        }

        // Attach user to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            // Extract roll number from email (e.g., 12111XXX@nitkkr.ac.in)
            roll_number: decodedToken.email.split("@")[0],
            // Google Auth provides name and picture
            name: decodedToken.name || null,
            picture: decodedToken.picture || null,
        };

        next();
    } catch (error) {
        console.error("[Auth] Token verification failed:", error.message);
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
};

module.exports = authMiddleware;
