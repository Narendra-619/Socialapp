import cron from "node-cron";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * Publish a scheduled post:
 * 1. Set status to published
 * 2. Send deferred mention notifications
 */
const publishPost = async (post) => {
  try {
    post.status = "published";
    await post.save();

    if (post.mentions && post.mentions.length > 0) {
      const author = await User.findById(post.userId).select("username");
      if (!author) {
        await Post.findByIdAndDelete(post._id);
        return;
      }
      const notifications = post.mentions
        .filter(mId => mId.toString() !== post.userId.toString())
        .map(mentionedId => ({
          recipient: mentionedId,
          sender: post.userId,
          type: "mention",
          post: post._id,
          message: `${author.username} mentioned you in a post`
        }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    console.log(`[Scheduler] Published post ${post._id} by user ${post.userId}`);
  } catch (error) {
    console.error(`[Scheduler] Failed to publish post ${post._id}:`, error);
  }
};

/**
 * Check for overdue scheduled posts (missed by cron, e.g. server was down)
 */
export const catchUpOverduePosts = async () => {
  try {
    const overdue = await Post.find({
      status: "scheduled",
      scheduledAt: { $lte: new Date() }
    });

    if (overdue.length > 0) {
      console.log(`[Scheduler] Catching up ${overdue.length} overdue scheduled posts concurrently`);
      await Promise.allSettled(overdue.map(post => publishPost(post)));
    }
  } catch (error) {
    console.error("[Scheduler] Catch-up error:", error);
  }
};

let isSchedulerRunning = false;

export const startScheduler = () => {
  cron.schedule("* * * * *", async () => {
    if (isSchedulerRunning) return;
    isSchedulerRunning = true;
    try {
      const now = new Date();
      const duePosts = await Post.find({
        status: "scheduled",
        scheduledAt: { $lte: now }
      });

      if (duePosts.length > 0) {
        await Promise.allSettled(duePosts.map(post => publishPost(post)));
      }
    } catch (error) {
      console.error("[Scheduler] Cron error:", error);
    } finally {
      isSchedulerRunning = false;
    }
  });

  console.log("[Scheduler] Cron job started (runs every 60 seconds)");
};
