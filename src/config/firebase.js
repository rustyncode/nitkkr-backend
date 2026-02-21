const admin = require("firebase-admin");
const constants = require("./constants");

if (!admin.apps.length) {
    // If we have service account credentials in env, use them
    if (constants.FIREBASE_CLIENT_EMAIL && constants.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: constants.FIREBASE_PROJECT_ID,
                clientEmail: constants.FIREBASE_CLIENT_EMAIL,
                privateKey: constants.FIREBASE_PRIVATE_KEY,
            }),
            storageBucket: constants.FIREBASE_STORAGE_BUCKET,
        });
        console.log("[Firebase] Admin SDK initialized with service account.");
    } else {
        // Fallback to default credentials (works on Vercel if configured)
        admin.initializeApp({
            projectId: constants.FIREBASE_PROJECT_ID,
            storageBucket: constants.FIREBASE_STORAGE_BUCKET,
        });
        console.log("[Firebase] Admin SDK initialized with default credentials.");
    }
}

module.exports = admin;
