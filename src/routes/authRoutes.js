const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Send 6-digit OTP to NIT KKR email
 * @access  Public
 */
router.post("/send-otp", otpController.sendOtp);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify 6-digit OTP
 * @access  Public
 */
router.post("/verify-otp", otpController.verifyOtp);

module.exports = router;
