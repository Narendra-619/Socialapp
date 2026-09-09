import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getDrafts, createDraft, updateDraft, deleteDraft } from "../controllers/draftController.js";

const router = express.Router();

router.get("/", protect, getDrafts);
router.post("/", protect, createDraft);
router.put("/:id", protect, updateDraft);
router.delete("/:id", protect, deleteDraft);

export default router;
