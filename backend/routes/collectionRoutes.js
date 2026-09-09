import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getCollections,
  createCollection,
  renameCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
  getCollectionPosts
} from "../controllers/collectionController.js";

const router = express.Router();

router.get("/", protect, getCollections);
router.post("/", protect, createCollection);
router.put("/:id", protect, renameCollection);
router.delete("/:id", protect, deleteCollection);
router.post("/:id/posts", protect, addToCollection);
router.delete("/:id/posts/:postId", protect, removeFromCollection);
router.get("/:id/posts", protect, getCollectionPosts);

export default router;
