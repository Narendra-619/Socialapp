import express from "express";
import { register, login } from "../controllers/auth.js";
import { verifyEmail, resendVerification } from "../controllers/passwordResetController.js";
import { authLimiter, registerLimiter, otpLimiter } from "../middleware/rateLimiter.js";
import { validateRegistration, validateLogin } from "../middleware/validate.js";

const router = express.Router();

router.post("/register", registerLimiter, validateRegistration, register);
router.post("/login", authLimiter, validateLogin, login);
router.post("/verify-email", otpLimiter, verifyEmail);
router.post("/resend-verification", otpLimiter, resendVerification);

export default router;
