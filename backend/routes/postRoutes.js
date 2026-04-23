import express from "express";
import { createPost, getPosts, toggleLike, addComment, deletePost, updatePost, searchPosts, getPostById } from "../controllers/postController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Middleware to handle Multer errors specifically
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single("image");
  
  uploadSingle(req, res, (err) => {
    if (err) {
      console.error("MULTER ERROR:", err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Post-related routes with integrated protection and upload error handling
router.post("/", protect, handleUpload, createPost);   
router.get("/", getPosts);               
router.get("/search", protect, searchPosts);
router.get("/:id", protect, getPostById);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/comment", protect, addComment);
router.put("/:id", protect, handleUpload, updatePost);
router.delete("/:id", protect, deletePost);

export default router;