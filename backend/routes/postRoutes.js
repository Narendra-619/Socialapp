import express from "express";
import { createPost, getPosts, toggleLike, addComment, deleteComment, deletePost, updatePost, searchPosts, getPostById, toggleSave, getSavedPosts, getPostAnalytics, getUserAnalytics, getScheduledPosts, cancelScheduledPost } from "../controllers/postController.js";
import { protect } from "../middleware/authMiddleware.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { upload } from "../middleware/upload.js";
import { validateComment, validatePost } from "../middleware/validate.js";

const router = express.Router();

const postUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "video", maxCount: 1 }
]);

// Post-related routes
router.post("/", protect, postUpload, validatePost, createPost);
router.get("/", optionalAuth, getPosts);
router.get("/search", protect, searchPosts);
router.get("/saved", protect, getSavedPosts);
router.get("/scheduled", protect, getScheduledPosts);
router.get("/analytics/user", protect, getUserAnalytics);
router.get("/analytics/user/:userId", protect, getUserAnalytics);
router.get("/:id/analytics", protect, getPostAnalytics);
router.get("/:id", protect, getPostById);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/save", protect, toggleSave);
router.post("/:id/comment", protect, validateComment, addComment);
router.post("/:id/cancel-schedule", protect, cancelScheduledPost);
router.delete("/:postId/comments/:commentId", protect, deleteComment);
router.put("/:id", protect, postUpload, updatePost);
router.delete("/:id", protect, deletePost);

export default router;