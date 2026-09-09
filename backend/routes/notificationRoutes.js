import express from "express";
import {
  getNotifications,
  markAsRead,
  markSingleAsRead,
  deleteNotification
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/read", protect, markAsRead);
router.put("/:id/read", protect, markSingleAsRead);
router.delete("/:id", protect, deleteNotification);

export default router;
