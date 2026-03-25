import express from "express";
import { createPost, getPosts, toggleLike, addComment, deletePost } from "../controllers/postController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Post-related routes with integrated protection middleware
router.post("/", protect, createPost);   
router.get("/", getPosts);               
router.post("/:id/like", protect, toggleLike);
router.post("/:id/comment", protect, addComment);
router.delete("/:id", protect, deletePost);

export default router;