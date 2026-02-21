const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

/**
 * @route   GET /api/v1/user/me
 * @desc    Get current user profile (or create if new)
 * @access  Private
 */
router.get("/me", authMiddleware, userController.getMyProfile);

/**
 * @route   PATCH /api/v1/user/me
 * @desc    Update user profile
 * @access  Private
 */
router.patch("/me", authMiddleware, userController.updateProfile);

module.exports = router;
