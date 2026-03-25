import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Authentication Middleware
 * Verifies Bearer token and attaches user object to request
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if authorization header exists and starts with Bearer
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Split "Bearer TOKEN" into ["Bearer", "TOKEN"] and take index 1
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        error: "Not authorized, no token"
      });
    }

    // Verify token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB excluding password field and attach to request object
    req.user = await User.findById(decoded.id).select("-password");

    next();

  } catch (error) {
    res.status(401).json({
      error: "Not authorized, token failed"
    });
  }
};