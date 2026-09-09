import User from "../models/User.js";
import Notification from "../models/Notification.js";
import PasswordReset from "../models/PasswordReset.js";
import { sendVerificationEmail } from "../services/emailService.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const safeUsername = username.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const usernameExists = await User.findOne({ username: new RegExp(`^${safeUsername}$`, "i") });
    if (usernameExists) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    const user = new User({
      username,
      email: email.toLowerCase(),
      password
    });

    await user.save();

    try {
      await Notification.create({
        recipient: user._id,
        type: "welcome",
        message: "Welcome to Nexora 🚀 Your space to connect, share moments, chat with friends, and express yourself. Start posting, reacting, and building your network today!"
      });

      await PasswordReset.updateMany(
        { userId: user._id, used: false, purpose: "email-verification" },
        { used: true }
      );

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await PasswordReset.create({
        userId: user._id,
        otp: hashOTP(otp),
        expiresAt,
        purpose: "email-verification"
      });

      await sendVerificationEmail(user.email, otp);

      res.status(201).json({
        message: "Verification code sent to your email",
        userId: user._id
      });
    } catch (emailError) {
      console.error("Registration email/notification error:", emailError);
      await User.findByIdAndDelete(user._id);
      res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

/**
 * Authenticate user and return token
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email/username and password are required"
      });
    }

    const safeIdentifier = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { username: { $regex: new RegExp(`^${safeIdentifier}$`, "i") } }
      ]
    });
    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};
