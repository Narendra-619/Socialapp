import mongoose from "mongoose";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Collection from "../models/Collection.js";
import { cloudinary, extractPublicId } from "../middleware/upload.js";

/**
 * Create a new social post
 */
export const createPost = async (req, res) => {
  try {
    const { text, allowDownload, scheduledAt } = req.body;
    const image = req.files?.image?.[0]?.path || req.body.image || "";
    const video = req.files?.video?.[0]?.path || req.body.video || "";

    if (req.body.image && req.body.image.length > 1000000) {
      return res.status(400).json({ error: "Image data too large" });
    }
    
    // Validate that post has content
    if (!text && !image && !video) {
      return res.status(400).json({
        error: "Post must have text, image, or video"
      });
    }

    // Sanitize text length
    const sanitizedText = text ? text.slice(0, 5000) : "";

    // Parse @mentions from text
    const mentionUsernames = sanitizedText ? [...new Set((sanitizedText.match(/@(\w+)/g) || []).map(m => m.slice(1)))] : [];
    let mentionedUsers = [];
    if (mentionUsernames.length > 0) {
      mentionedUsers = await User.find({ username: { $in: mentionUsernames } }).select("_id username");
    }

    // Determine status and scheduledAt
    let scheduledDate = null;
    let isScheduled = false;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: "Invalid scheduled date format" });
      }
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: "Scheduled time must be in the future" });
      }
      isScheduled = true;
    }
    const status = isScheduled ? "scheduled" : "published";

    // Initialize new post with user ID from protection middleware
    const post = new Post({
      userId: req.user._id, 
      text: sanitizedText,
      image,
      video,
      allowDownload: allowDownload !== "false" && allowDownload !== false,
      mentions: mentionedUsers.map(u => u._id),
      status,
      scheduledAt: isScheduled ? scheduledDate : null
    });

    await post.save();

    // Only send mention notifications immediately for published posts
    // Scheduled posts will send notifications when published by the scheduler
    if (!isScheduled) {
      for (const mentioned of mentionedUsers) {
        if (mentioned._id.toString() !== req.user._id.toString()) {
          await Notification.create({
            recipient: mentioned._id,
            sender: req.user._id,
            type: "mention",
            post: post._id,
            message: `${req.user.username} mentioned you in a post`
          });
        }
      }
    }

    res.status(201).json({
      message: isScheduled ? "Post scheduled" : "Post created",
      post
    });

  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    res.status(500).json({
      error: error.message || "Server error"
    });
  }
};

/**
 * Fetch posts: First 3 on each page are newest (chronological),
 * remaining posts are sorted by engagement score (Instagram-style).
 */
export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // L5: cap at 50
    const skip = (page - 1) * limit;
    const { feed } = req.query;

    const publishedFilter = { $or: [{ status: "published" }, { status: { $exists: false } }] };

    let query = { ...publishedFilter };

    if (feed === "following" && req.user) {
      const currentUser = await User.findById(req.user._id).select("following");
      const followingIds = currentUser?.following || [];
      query = { userId: { $in: followingIds }, ...publishedFilter };
    } else {
      const currentUser = req.user ? await User.findById(req.user._id).select("following") : null;
      const followingIds = (currentUser?.following || []).map(id => id.toString());
      const viewerId = req.user?._id?.toString();

      // Find private accounts that the viewer is NOT following and NOT the owner of
      const excludedQuery = { isPrivate: true };
      const allowedToSeePrivate = [viewerId, ...followingIds].filter(Boolean);
      if (allowedToSeePrivate.length > 0) {
        excludedQuery._id = { $nin: allowedToSeePrivate };
      }

      const privateUsers = await User.find(excludedQuery).select("_id");
      const hiddenUserIds = privateUsers.map((u) => u._id);

      query = { userId: { $nin: hiddenUserIds }, ...publishedFilter };
    }

    const poolSize = page === 1 ? limit : limit * 4;
    const pool = await Post.find(query)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(poolSize);

    const newestCount = Math.min(3, pool.length);
    const newest = pool.slice(0, newestCount).map(p => p.toObject());
    const rest = pool.slice(newestCount);

    const sortedRest = rest
      .map(p => ({
        ...p.toObject(),
        _engagementScore: (p.likes?.length || 0) + (p.comments?.length || 0) * 2
      }))
      .sort((a, b) => b._engagementScore - a._engagementScore);

    const posts = [...newest, ...sortedRest].slice(0, limit);

    let savedSet = new Set();
    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("savedPosts");
      if (currentUser?.savedPosts) {
        savedSet = new Set(currentUser.savedPosts.map(id => id.toString()));
      }
    }

    const postsWithSave = posts.map(p => ({
      ...p,
      isSaved: savedSet.has((p._id || p.id)?.toString())
    }));

    res.status(200).json(postsWithSave);

  } catch (error) {
    console.error("GET POSTS ERROR:", error);
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Search posts by text
 */
export const searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    // Escape regex special characters to prevent ReDoS
    const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const followingIds = req.user
      ? (await User.findById(req.user._id).select("following"))?.following || []
      : [];

    const allowedIds = [...followingIds.map(id => id.toString()), req.user?._id?.toString()].filter(Boolean);
    const hiddenPrivateUsers = await User.find({
      isPrivate: true,
      _id: { $nin: allowedIds }
    }).select("_id");
    const hiddenUserIds = hiddenPrivateUsers.map(u => u._id);

    const posts = await Post.find({
      text: { $regex: safeQuery, $options: "i" },
      userId: { $nin: hiddenUserIds },
      $or: [{ status: "published" }, { status: { $exists: false } }]
    })
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json(posts);
  } catch (error) {
    console.error("SEARCH POSTS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getPostById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const post = await Post.findById(req.params.id)
      .populate("userId", "username profilePicture isPrivate")
      .populate("comments.userId", "username profilePicture");
    if (!post) return res.status(404).json({ error: "Post not found" });

    const isOwner = req.user && post.userId?._id?.toString() === req.user._id.toString();

    // Prevent non-owners from accessing drafts or scheduled posts
    if (post.status && post.status !== "published" && !isOwner) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId?.isPrivate && !isOwner) {
      const postOwner = await User.findById(post.userId._id).select("followers");
      if (!postOwner || !postOwner.followers) {
        return res.status(404).json({ error: "Author not found" });
      }
      const isFollower = postOwner.followers.some(
        (id) => id.toString() === req.user?._id?.toString()
      );
      if (!isFollower) {
        return res.status(403).json({ error: "This post is from a private account" });
      }
    }

    // Increment views (deduplicate atomically without VersionError)
    const authorIdStr = (post.userId?._id || post.userId)?.toString();
    const viewerIdStr = req.user?._id?.toString();
    if (viewerIdStr && authorIdStr && authorIdStr !== viewerIdStr) {
      const alreadyViewed = (post.viewedBy || []).some(id => id.toString() === viewerIdStr);
      if (!alreadyViewed) {
        post.views = (post.views || 0) + 1;
        await Post.updateOne(
          { _id: post._id, viewedBy: { $ne: req.user._id } },
          {
            $inc: { views: 1 },
            $push: { viewedBy: { $each: [req.user._id], $slice: -1000 } }
          }
        );
      }
    }

    let isSaved = false;
    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("savedPosts");
      isSaved = currentUser?.savedPosts?.some(id => id.toString() === post._id.toString()) || false;
    }
    const postObj = post.toObject();
    postObj.isSaved = isSaved;

    res.status(200).json(postObj);
  } catch (err) {
    console.error("GET POST BY ID ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};



/**
 * Handle Like/Unlike logic for a post
 */
export const toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isLiked = post.likes.some(id => id.toString() === userId.toString());

    const updateOperation = isLiked
      ? { $pull: { likes: userId } }
      : { $addToSet: { likes: userId } };

    const updatedPost = await Post.findByIdAndUpdate(postId, updateOperation, { new: true });

    // Notification logic (deduplicated)
    if (!isLiked && post.userId && post.userId.toString() !== req.user._id.toString()) {
      const existingNotification = await Notification.findOne({
        recipient: post.userId,
        sender: req.user._id,
        type: "like",
        post: post._id
      });
      if (!existingNotification) {
        await Notification.create({
          recipient: post.userId,
          sender: req.user._id,
          type: "like",
          post: post._id
        });
      }
    }

    res.status(200).json({
      message: isLiked ? "Post unliked" : "Post liked",
      likesCount: updatedPost.likes.length,
      isLiked: !isLiked
    });

  } catch (error) {
    console.error("TOGGLE LIKE ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Add a comment to a specific post
 */
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Comment cannot be empty"
      });
    }

    // Sanitize comment text length
    const sanitizedText = text.slice(0, 1000);

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    // Create comment object
    const newComment = {
      userId: req.user._id,
      text: sanitizedText
    };

    // Push new comment to the comments array
    post.comments.push(newComment);

    await post.save();

    // Notification logic (deduplicated) for post owner — only first comment per user per post
    if (post.userId.toString() !== req.user._id.toString()) {
      const existingNotification = await Notification.findOne({
        recipient: post.userId,
        sender: req.user._id,
        type: "comment",
        post: post._id,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // within last hour
      });
      if (!existingNotification) {
        await Notification.create({
          recipient: post.userId,
          sender: req.user._id,
          type: "comment",
          post: post._id
        });
      }
    }

    // Parse @mentions in comment and create notifications
    const mentionUsernames = [...new Set((sanitizedText.match(/@(\w+)/g) || []).map(m => m.slice(1)))];
    if (mentionUsernames.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: mentionUsernames } }).select("_id username");
      for (const mentioned of mentionedUsers) {
        if (mentioned._id.toString() !== req.user._id.toString()) {
          await Notification.create({
            recipient: mentioned._id,
            sender: req.user._id,
            type: "mention",
            post: post._id,
            message: `${req.user.username} mentioned you in a comment`
          });
        }
      }
    }

    const populatedPost = await Post.findById(postId).populate("comments.userId", "username profilePicture");
    res.status(201).json({ message: "Comment added", comments: populatedPost.comments });

  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Delete a comment from a post (comment owner only)
 */
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    post.comments.pull(commentId);
    await post.save();

    const populatedPost = await Post.findById(postId).populate("comments.userId", "username profilePicture");
    res.status(200).json({ message: "Comment deleted", comments: populatedPost.comments });

  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update a post (Only owner authorized)
 */
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Ownership check
    if (!post.userId || post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to edit this post" });
    }

    const { text } = req.body;
    if (text !== undefined) {
      const sanitizedText = typeof text === "string" ? text.trim() : "";
      if (sanitizedText.length > 5000) {
        return res.status(400).json({ error: "Post text must be under 5000 characters" });
      }
      post.text = sanitizedText;
    }

    const uploadedImage = req.files?.image?.[0];
    if (uploadedImage) {
      if (post.image) {
        const publicId = extractPublicId(post.image);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      post.image = uploadedImage.path;
    }

    const uploadedVideo = req.files?.video?.[0];
    if (uploadedVideo) {
      if (post.video) {
        const publicId = extractPublicId(post.video);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        }
      }
      post.video = uploadedVideo.path;
    }

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture");

    res.status(200).json({
      message: "Post updated",
      post: populatedPost
    });

  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Delete a post (Only owner authorized)
 */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    // Ownership check
    if (!post.userId || post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Not authorized to delete this post"
      });
    }

    if (post.image) {
      const publicId = extractPublicId(post.image);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    if (post.video) {
      const videoPublicId = extractPublicId(post.video);
      if (videoPublicId) {
        await cloudinary.uploader.destroy(videoPublicId, { resource_type: "video" });
      }
    }

    await User.updateMany({ savedPosts: post._id }, { $pull: { savedPosts: post._id } });
    await Collection.updateMany({ posts: post._id }, { $pull: { posts: post._id } });
    await Notification.deleteMany({ post: post._id });

    await post.deleteOne();

    res.status(200).json({
      message: "Post deleted"
    });

  } catch (error) {
    console.error("DELETE POST ERROR:", error);
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Toggle save/bookmark a post
 */
export const toggleSave = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const user = await User.findById(userId).select("savedPosts");
    const isSaved = (user?.savedPosts || []).some(
      (id) => (id._id || id).toString() === postId.toString()
    );

    if (isSaved) {
      await User.findByIdAndUpdate(userId, { $pull: { savedPosts: postId } });
      await Collection.updateOne(
        { userId, name: "All Saved" },
        { $pull: { posts: postId } }
      );
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { savedPosts: postId } });
      await Collection.findOneAndUpdate(
        { userId, name: "All Saved" },
        { $addToSet: { posts: postId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.status(200).json({
      message: isSaved ? "Post unsaved" : "Post saved",
      saved: !isSaved
    });

  } catch (error) {
    console.error("TOGGLE SAVE ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get saved/bookmarked posts
 */
export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedPosts");
    const savedList = user?.savedPosts || [];

    const reversedOrder = [...savedList].reverse();

    const posts = await Post.find({ _id: { $in: savedList } })
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture");

    const postMap = new Map(posts.map(p => [p._id.toString(), p.toObject()]));

    const postsWithSave = reversedOrder
      .map(id => postMap.get(id.toString()))
      .filter(Boolean)
      .map(p => ({ ...p, isSaved: true }));

    res.status(200).json(postsWithSave);
  } catch (error) {
    console.error("GET SAVED POSTS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get analytics for a specific post (daily views/likes/comments for 7d or 30d)
 */
export const getPostAnalytics = async (req, res) => {
  try {
    const { period = "7d" } = req.query;
    const days = period === "30d" ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Get daily breakdown from comments and likes timestamps
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + (days - 1 - i));
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayLikes = (post.likes || []).length;

      const dayComments = (post.comments || []).filter(c => {
        if (!c.createdAt) return false;
        const commentDate = new Date(c.createdAt);
        return commentDate >= dayStart && commentDate < dayEnd;
      }).length;

      dailyData.push({
        date: dayStart.toISOString().split("T")[0],
        views: Math.round((post.views || 0) / days), // Approximate daily views
        likes: i === 0 ? (post.likes?.length || 0) : 0,
        comments: dayComments
      });
    }

    const totalViews = post.views || 0;
    const totalLikes = post.likes?.length || 0;
    const totalComments = post.comments?.length || 0;

    // Calculate change from previous period
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - days);
    const prevComments = (post.comments || []).filter(c => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d >= prevStart && d < startDate;
    }).length;

    res.status(200).json({
      total: { views: totalViews, likes: totalLikes, comments: totalComments },
      daily: dailyData,
      change: {
        views: 0,
        likes: 0,
        comments: prevComments > 0 ? Math.round(((totalComments - prevComments) / prevComments) * 100) : (totalComments > 0 ? 100 : 0)
      }
    });
  } catch (error) {
    console.error("GET POST ANALYTICS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get aggregated analytics for all of a user's posts
 */
export const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const { period = "30d" } = req.query;
    const days = period === "30d" ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // H8: Project only needed fields + limit to prevent loading ALL posts into memory
    const posts = await Post.find({ userId })
      .select("views likes comments text image video createdAt")
      .limit(500);

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let tweetsCount = 0;
    let photosCount = 0;
    let videosCount = 0;

    const dailyMap = {};

    for (const post of posts) {
      totalViews += post.views || 0;
      totalLikes += post.likes?.length || 0;
      totalComments += post.comments?.length || 0;

      if (post.video) {
        videosCount++;
      } else if (post.image) {
        photosCount++;
      } else {
        tweetsCount++;
      }

      // Aggregate daily comments
      for (const comment of post.comments || []) {
        if (!comment.createdAt || isNaN(new Date(comment.createdAt).getTime())) continue;
        const day = new Date(comment.createdAt).toISOString().split("T")[0];
        if (!dailyMap[day]) dailyMap[day] = { views: 0, likes: 0, comments: 0 };
        dailyMap[day].comments += 1;
      }
    }

    // Fill in missing days
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      daily.push({
        date: key,
        views: dailyMap[key]?.views || Math.round(totalViews / days),
        likes: dailyMap[key]?.likes || Math.round(totalLikes / days),
        comments: dailyMap[key]?.comments || 0
      });
    }

    // Recent posts with stats
    const topPosts = posts
      .sort((a, b) => ((b.likes?.length || 0) + (b.comments?.length || 0)) - ((a.likes?.length || 0) + (a.comments?.length || 0)))
      .slice(0, 10)
      .map(p => ({
        _id: p._id,
        text: p.text?.slice(0, 80),
        image: p.image,
        video: p.video,
        views: p.views || 0,
        likes: p.likes?.length || 0,
        comments: p.comments?.length || 0,
        createdAt: p.createdAt
      }));

    res.status(200).json({
      total: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        posts: posts.length,
        tweets: tweetsCount,
        photos: photosCount,
        videos: videosCount
      },
      daily,
      topPosts,
      change: {
        views: 0,
        likes: 0,
        comments: 0
      }
    });
  } catch (error) {
    console.error("GET USER ANALYTICS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get all scheduled posts for the current user
 */
export const getScheduledPosts = async (req, res) => {
  try {
    const posts = await Post.find({
      userId: req.user._id,
      status: "scheduled",
      scheduledAt: { $gt: new Date() }
    })
      .populate("userId", "username profilePicture")
      .sort({ scheduledAt: 1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error("GET SCHEDULED POSTS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Cancel a scheduled post
 */
export const cancelScheduledPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (post.status !== "scheduled") {
      return res.status(400).json({ error: "Post is not scheduled" });
    }

    post.status = "draft";
    post.scheduledAt = null;
    await post.save();

    res.status(200).json({ message: "Schedule cancelled", post });
  } catch (error) {
    console.error("CANCEL SCHEDULED POST ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};