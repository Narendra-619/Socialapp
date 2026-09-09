import User from "../models/User.js";
import Post from "../models/Post.js";
import FollowRequest from "../models/FollowRequest.js";
import { cloudinary, extractPublicId } from "../middleware/upload.js";
import mongoose from "mongoose";

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const query = mongoose.Types.ObjectId.isValid(userId) ? { _id: userId } : { username: userId };
    const user = await User.findOne(query).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = user.followers.some(
      (id) => id.toString() === currentUserId.toString()
    );
    const isOwnProfile = (user._id?.toString() || userId) === currentUserId.toString();
    const isLocked = user.isPrivate && !isFollowing && !isOwnProfile;

    let posts = [];
    let hasMore = false;
    if (!isLocked) {
      const postFilter = {
        userId: user._id,
        ...(isOwnProfile ? {} : { $or: [{ status: "published" }, { status: { $exists: false } }] })
      };
      const allPosts = await Post.find(postFilter)
        .populate("userId", "username profilePicture")
        .populate("comments.userId", "username profilePicture")
        .sort({ createdAt: -1 })
        .limit(21);

      hasMore = allPosts.length > 20;
      posts = allPosts.slice(0, 20);

      const currentUser = await User.findById(currentUserId).select("savedPosts");
      const savedSet = new Set((currentUser?.savedPosts || []).map(id => id.toString()));
      posts = posts.map(p => ({
        ...p.toObject(),
        isSaved: savedSet.has(p._id.toString())
      }));
    }

    let pendingRequest = null;
    if (!isOwnProfile && !isFollowing && user.isPrivate) {
      pendingRequest = await FollowRequest.findOne({
        requester: currentUserId,
        recipient: user._id,
        status: "pending"
      });
    }

    res.status(200).json({
      user,
      posts,
      hasMore,
      isLocked,
      isFollowing,
      pendingRequest: pendingRequest ? true : false,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);
    // M8: Reject excessively long queries to prevent regex CPU abuse
    if (q.length > 100) return res.status(400).json({ error: "Search query too long" });

    // Escape regex special characters to prevent ReDoS
    const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      username: { $regex: safeQuery, $options: "i" }
    }).select("username profilePicture isPrivate").limit(10);

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { username, bio, isPrivate } = req.body;
    const userId = req.user._id;

    // Sanitize inputs
    const sanitizedUsername = username ? username.trim().slice(0, 30) : undefined;
    const sanitizedBio = bio !== undefined ? bio.trim().slice(0, 500) : undefined;

    // Validate username format if provided
    if (sanitizedUsername && !/^[a-zA-Z0-9_]{3,30}$/.test(sanitizedUsername)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores (_), 3-30 characters" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (sanitizedUsername && sanitizedUsername.toLowerCase() !== user.username?.toLowerCase()) {
      const existingUser = await User.findOne({ username: sanitizedUsername.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      user.username = sanitizedUsername;
    }

    if (sanitizedBio !== undefined) user.bio = sanitizedBio;

    if (isPrivate !== undefined) {
      user.isPrivate = isPrivate === "true" || isPrivate === true;
    }

    if (req.files?.profilePicture?.[0]) {
      if (user.profilePicture) {
        const publicId = extractPublicId(user.profilePicture);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      user.profilePicture = req.files.profilePicture[0].path;
    }

    if (req.files?.coverImage?.[0]) {
      if (user.coverImage) {
        const publicId = extractPublicId(user.coverImage);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      user.coverImage = req.files.coverImage[0].path;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        coverImage: user.coverImage,
        isPrivate: user.isPrivate
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { before, limit: queryLimit } = req.query;
    const limit = Math.min(parseInt(queryLimit) || 20, 50);
    const currentUserId = req.user._id;

    const query = mongoose.Types.ObjectId.isValid(userId) ? { _id: userId } : { username: userId };
    const user = await User.findOne(query).select("_id isPrivate followers");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isOwnProfile = user._id.toString() === currentUserId.toString();
    const isFollowing = user.followers?.some(id => id.toString() === currentUserId.toString());
    if (user.isPrivate && !isOwnProfile && !isFollowing) {
      return res.status(403).json({ error: "This account is private" });
    }

    const postQuery = {
      userId: user._id,
      ...(isOwnProfile ? {} : { $or: [{ status: "published" }, { status: { $exists: false } }] })
    };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      postQuery._id = { $lt: before };
    }

    const allPosts = await Post.find(postQuery)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = allPosts.length > limit;
    const posts = allPosts.slice(0, limit);

    const currentUser = await User.findById(currentUserId).select("savedPosts");
    const savedSet = new Set((currentUser?.savedPosts || []).map(id => id.toString()));
    const enriched = posts.map(p => ({
      ...p.toObject(),
      isSaved: savedSet.has(p._id.toString())
    }));

    res.status(200).json({ posts: enriched, hasMore });
  } catch (error) {
    console.error("GET USER POSTS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};
