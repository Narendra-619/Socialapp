import express from "express";
import { body } from "express-validator";
import {
  requestReset,
  verifyOTP,
  resetPassword
} from "../controllers/passwordResetController.js";
import { otpLimiter } from "../middleware/rateLimiter.js";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

router.post("/forgot-password", otpLimiter,
  body("email").isEmail().withMessage("Invalid email format"),
  handleValidation,
  requestReset
);
router.post("/verify-otp", otpLimiter,
  body("email").isEmail().withMessage("Invalid email format"),
  body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  handleValidation,
  verifyOTP
);
router.post("/reset-password", otpLimiter,
  body("resetToken").notEmpty().withMessage("Reset token is required"),
  body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  handleValidation,
  resetPassword
);

export default router;
