import express from "express";
import { protect } from "../middleware/authmiddleware.js";
import { createPost } from "../controllers/postController.js";

const router = express.Router();

router.post("/create", protect, createPost);

export default router;