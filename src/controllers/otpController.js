const db = require("../config/db");
const nodemailer = require("nodemailer");
const getOtpTemplate = require("../utils/otpTemplate");
const admin = require("../config/firebase");
const constants = require("../config/constants");

// Configure Gmail SMTP Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: constants.SMTP_USER,
        pass: constants.SMTP_PASS,
    },
});

exports.sendOtp = async (req, res) => {
    const { email } = req.body;

    if (!email || !email.endsWith("@nitkkr.ac.in")) {
        return res.status(400).json({ success: false, error: "Access restricted to @nitkkr.ac.in emails" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 min

    try {
        // Save to DB
        await db.query(
            "INSERT INTO otps (email, code, expires_at) VALUES ($1, $2, $3)",
            [email, code, expiresAt]
        );

        // Send Email via Gmail SMTP
        const mailOptions = {
            from: `"RustiNet Verification" <${constants.SMTP_USER}>`,
            to: email,
            subject: `RustiNet: Verification Code`,
            html: getOtpTemplate(code),
        };

        await transporter.sendMail(mailOptions);
        console.log("[Auth] OTP [%s] sent successfully to %s via Gmail", code, email);

        res.json({
            success: true,
            message: "A 6-digit code has been sent to your college email."
        });
    } catch (error) {
        console.error("[Auth] OTP generation/send failed:", error);
        res.status(500).json({ success: false, error: "Something went wrong. Please try again." });
    }
};

exports.verifyOtp = async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, error: "Email and code are required." });
    }

    try {
        const result = await db.query(
            "SELECT * FROM otps WHERE email = $1 AND code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            [email, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: "Invalid or expired code." });
        }

        // OTP is valid! Cleanup
        await db.query("DELETE FROM otps WHERE email = $1", [email]);

        // 1. Get or Create Firebase User
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                const newUser = await admin.auth().createUser({ email });
                uid = newUser.uid;

                const rollNumber = email.split('@')[0];
                await db.query(
                    "INSERT INTO users (email, roll_number, firebase_uid) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET firebase_uid = $3",
                    [email, rollNumber, uid]
                );
            } else {
                throw err;
            }
        }

        // 2. Generate Firebase Custom Token
        const customToken = await admin.auth().createCustomToken(uid);

        res.json({
            success: true,
            message: "OTP verified!",
            token: customToken
        });
    } catch (error) {
        console.error("[Auth] OTP verification failed:", error);
        res.status(500).json({ success: false, error: "Verification failed. Please try again." });
    }
};
