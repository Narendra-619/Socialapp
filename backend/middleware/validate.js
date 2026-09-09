import { body, query, validationResult } from "express-validator";

export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

export const validateRegistration = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers, and underscores (_)"),
  body("email")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  handleValidation
];

export const validateLogin = [
  body("email").notEmpty().withMessage("Email/username is required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidation
];

export const validatePost = [
  body("text")
    .optional()
    .isLength({ max: 5000 }).withMessage("Post text must be under 5000 characters")
    .trim(),
  handleValidation
];

export const validateComment = [
  body("text")
    .notEmpty().withMessage("Comment cannot be empty")
    .isLength({ max: 1000 }).withMessage("Comment must be under 1000 characters")
    .trim(),
  handleValidation
];

export const validateProfile = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers, and underscores (_)"),
  body("bio")
    .optional()
    .isLength({ max: 500 }).withMessage("Bio must be under 500 characters")
    .trim(),
  handleValidation
];

export const validateSearch = [
  query("q")
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 }).withMessage("Search query must be 1-100 characters"),
  handleValidation
];
