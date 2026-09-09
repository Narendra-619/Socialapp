import mongoose from "mongoose";
import User from "../models/User.js";
import FollowRequest from "../models/FollowRequest.js";
import Notification from "../models/Notification.js";

export const toggleFollow = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const query = mongoose.Types.ObjectId.isValid(targetUserId)
      ? { _id: targetUserId }
      : { username: targetUserId };
    const targetUser = await User.findOne(query);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const isFollowing = targetUser.followers.some(id => id.toString() === currentUserId.toString());

    if (isFollowing) {
      await User.findByIdAndUpdate(targetUser._id, { $pull: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUser._id } });
      return res.status(200).json({ message: "Unfollowed", isFollowing: false });
    }

    if (targetUser.isPrivate) {
      const existingRequest = await FollowRequest.findOne({
        requester: currentUserId,
        recipient: targetUser._id,
        status: "pending"
      });

      if (existingRequest) {
        await FollowRequest.findByIdAndDelete(existingRequest._id);
        return res.status(200).json({ message: "Follow request cancelled", isPending: false });
      }

      const followRequest = await FollowRequest.create({
        requester: currentUserId,
        recipient: targetUser._id
      });

      await Notification.create({
        recipient: targetUser._id,
        sender: currentUserId,
        type: "follow_request",
        followRequest: followRequest._id,
        message: `${req.user.username} wants to follow you`
      });

      return res.status(201).json({ message: "Follow request sent", isPending: true });
    }

    await User.findByIdAndUpdate(targetUser._id, { $addToSet: { followers: currentUserId } });
    await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUser._id } });

    const existingNotification = await Notification.findOne({
      recipient: targetUser._id,
      sender: currentUserId,
      type: "follow"
    });
    if (!existingNotification) {
      await Notification.create({
        recipient: targetUser._id,
        sender: currentUserId,
        type: "follow",
        message: `${req.user.username} started following you`
      });
    }

    res.status(200).json({ message: "Followed", isFollowing: true });
  } catch (error) {
    console.error("TOGGLE FOLLOW ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.userId)
      ? { _id: req.params.userId }
      : { username: req.params.userId };
    const user = await User.findOne(query)
      .populate("followers", "username profilePicture isPrivate")
      .select("followers");
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentUser = await User.findById(req.user._id).select("following");
    const followingSet = new Set((currentUser?.following || []).map(id => id.toString()));

    const pendingRequests = await FollowRequest.find({
      requester: req.user._id,
      status: "pending"
    }).select("recipient");
    const pendingSet = new Set(pendingRequests.map(r => r.recipient.toString()));

    const enriched = user.followers.filter(Boolean).map(f => ({
      ...f.toObject(),
      isFollowing: followingSet.has(f._id.toString()),
      isPending: pendingSet.has(f._id.toString())
    }));

    res.status(200).json(enriched);
  } catch (error) {
    console.error("GET FOLLOWERS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.userId)
      ? { _id: req.params.userId }
      : { username: req.params.userId };
    const user = await User.findOne(query)
      .populate("following", "username profilePicture isPrivate")
      .select("following");
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentUser = await User.findById(req.user._id).select("following");
    const followingSet = new Set((currentUser?.following || []).map(id => id.toString()));

    const pendingRequests = await FollowRequest.find({
      requester: req.user._id,
      status: "pending"
    }).select("recipient");
    const pendingSet = new Set(pendingRequests.map(r => r.recipient.toString()));

    const enriched = user.following.filter(Boolean).map(f => ({
      ...f.toObject(),
      isFollowing: followingSet.has(f._id.toString()),
      isPending: pendingSet.has(f._id.toString())
    }));

    res.status(200).json(enriched);
  } catch (error) {
    console.error("GET FOLLOWING ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getFollowRequests = async (req, res) => {
  try {
    const requests = await FollowRequest.find({
      recipient: req.user._id,
      status: "pending"
    })
      .populate("requester", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("GET FOLLOW REQUESTS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const handleFollowRequest = async (req, res) => {
  try {
    const { action } = req.body;
    const request = await FollowRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (action === "accept") {
      await User.findByIdAndUpdate(request.recipient, { $addToSet: { followers: request.requester } });
      await User.findByIdAndUpdate(request.requester, { $addToSet: { following: request.recipient } });

      await Notification.create({
        recipient: request.requester,
        sender: request.recipient,
        type: "follow_accept",
        message: `${req.user.username} accepted your follow request`
      });

      await FollowRequest.findByIdAndDelete(request._id);
      return res.status(200).json({ message: "Follow request accepted" });
    }

    if (action === "reject") {
      await FollowRequest.findByIdAndDelete(request._id);
      return res.status(200).json({ message: "Follow request rejected" });
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("HANDLE FOLLOW REQUEST ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};
