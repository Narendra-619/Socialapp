import express from "express";
import {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowRequests,
  handleFollowRequest
} from "../controllers/followController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/follow-requests", protect, getFollowRequests);
router.post("/:userId/follow", protect, toggleFollow);
router.get("/:userId/followers", protect, getFollowers);
router.get("/:userId/following", protect, getFollowing);
router.put("/follow-requests/:requestId", protect, handleFollowRequest);

export default router;
