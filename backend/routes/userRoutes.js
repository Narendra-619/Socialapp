import express from "express";
import { getUserProfile, updateUserProfile, searchUsers, getUserPosts } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import { validateProfile } from "../middleware/validate.js";

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/:userId/posts", protect, getUserPosts);
router.get("/:userId", protect, getUserProfile);
router.put("/profile", protect, upload.fields([{ name: "profilePicture", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), validateProfile, updateUserProfile);

export default router;
