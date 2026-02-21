const db = require("../config/db");

/**
 * Get or create profile for the authenticated user
 */
const getMyProfile = async (req, res) => {
    const { uid, email, roll_number } = req.user;

    try {
        // 1. Try to find user in DB
        let result = await db.query(
            "SELECT * FROM users WHERE roll_number = $1 OR firebase_uid = $2",
            [roll_number, uid]
        );

        let user = result.rows[0];

        // 2. If user doesn't exist, create it (Dynamic Registration)
        if (!user) {
            const { name: googleName, picture: googlePicture } = req.user;
            console.log(`[User] Provisioning new user: ${roll_number}`);
            const createResult = await db.query(
                `INSERT INTO users (firebase_uid, roll_number, email, name, profile_pic_url) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
                [uid, roll_number, email, googleName, googlePicture]
            );
            user = createResult.rows[0];
        } else if (!user.firebase_uid) {
            // If user was pre-seeded but not linked to Firebase UID yet
            await db.query(
                "UPDATE users SET firebase_uid = $1, email = $2 WHERE id = $3",
                [uid, email, user.id]
            );
            user.firebase_uid = uid;
            user.email = email;
        }

        res.json({
            success: true,
            data: user,
        });
    } catch (err) {
        console.error("[User] Failed to fetch/create profile:", err.message);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

/**
 * Update user profile details
 */
const updateProfile = async (req, res) => {
    const { uid } = req.user;
    const { name, branch, semester, bio, profile_pic_url, location, latitude, longitude } = req.body;

    try {
        const result = await db.query(
            `UPDATE users 
       SET name = COALESCE($1, name),
           branch = COALESCE($2, branch),
           semester = COALESCE($3, semester),
           bio = COALESCE($4, bio),
           profile_pic_url = COALESCE($5, profile_pic_url),
           location = COALESCE($6, location),
           latitude = COALESCE($7, latitude),
           longitude = COALESCE($8, longitude),
           updated_at = NOW()
       WHERE firebase_uid = $9
       RETURNING *`,
            [name, branch, semester, bio, profile_pic_url, location, latitude, longitude, uid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (err) {
        console.error("[User] Failed to update profile:", err.message);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

module.exports = {
    getMyProfile,
    updateProfile,
};
