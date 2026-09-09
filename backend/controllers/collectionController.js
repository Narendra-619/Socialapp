import Collection from "../models/Collection.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export const getCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("posts", "image text createdAt");
    res.status(200).json(collections);
  } catch (error) {
    console.error("GET COLLECTIONS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createCollection = async (req, res) => {
  try {
    const { name, postId } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Collection name is required" });
    }

    const trimmedName = name.trim();
    let collection = await Collection.findOne({ userId: req.user._id, name: trimmedName });

    if (collection) {
      if (postId && mongoose.Types.ObjectId.isValid(postId)) {
        const postObjId = new mongoose.Types.ObjectId(postId);
        if (!collection.posts.some(p => p.toString() === postObjId.toString())) {
          collection.posts.push(postObjId);
          await collection.save();
        }
      }
    } else {
      const initialPosts = (postId && mongoose.Types.ObjectId.isValid(postId))
        ? [new mongoose.Types.ObjectId(postId)]
        : [];

      collection = new Collection({
        userId: req.user._id,
        name: trimmedName,
        posts: initialPosts
      });
      await collection.save();
    }

    if (postId && mongoose.Types.ObjectId.isValid(postId)) {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedPosts: postId } });
      await Collection.findOneAndUpdate(
        { userId: req.user._id, name: "All Saved" },
        { $addToSet: { posts: postId } },
        { upsert: true }
      );
    }

    const populated = await Collection.findById(collection._id).populate("posts", "image text createdAt");
    res.status(201).json({ message: "Collection created", collection: populated || collection });
  } catch (error) {
    console.error("CREATE COLLECTION ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const renameCollection = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Collection name is required" });
    }

    const trimmedName = name.trim();
    const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id });
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    if (collection.name === "All Saved") {
      return res.status(400).json({ error: "Cannot rename default collection" });
    }

    const duplicate = await Collection.findOne({
      userId: req.user._id,
      name: trimmedName,
      _id: { $ne: collection._id }
    });
    if (duplicate) {
      return res.status(400).json({ error: "A collection with this name already exists" });
    }

    collection.name = trimmedName;
    await collection.save();
    res.status(200).json({ message: "Collection renamed", collection });
  } catch (error) {
    console.error("RENAME COLLECTION ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id });
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    if (collection.name === "All Saved") {
      return res.status(400).json({ error: "Cannot delete default collection" });
    }

    await Collection.findByIdAndDelete(collection._id);
    res.status(200).json({ message: "Collection deleted" });
  } catch (error) {
    console.error("DELETE COLLECTION ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const addToCollection = async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: "postId is required" });
    // M9: Validate postId is a valid ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid postId" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid collection ID" });
    }

    const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id });
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    const postObjId = new mongoose.Types.ObjectId(postId);
    const isAlreadyIn = collection.posts.some(p => (p._id || p).toString() === postId.toString());
    if (!isAlreadyIn) {
      collection.posts.push(postObjId);
      await collection.save();
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedPosts: postObjId } });
    await Collection.findOneAndUpdate(
      { userId: req.user._id, name: "All Saved" },
      { $addToSet: { posts: postObjId } },
      { upsert: true }
    );

    const populated = await Collection.findById(collection._id).populate("posts", "image text createdAt");
    res.status(200).json({ message: "Post added to collection", collection: populated || collection });
  } catch (error) {
    console.error("ADD TO COLLECTION ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const removeFromCollection = async (req, res) => {
  try {
    const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id });
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    const postIdStr = req.params.postId;
    collection.posts = collection.posts.filter(id => (id._id || id).toString() !== postIdStr);
    await collection.save();

    // Check if post is still in any other collection
    const otherCollection = await Collection.findOne({
      userId: req.user._id,
      posts: postIdStr,
      _id: { $ne: collection._id }
    });
    if (!otherCollection) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { savedPosts: postIdStr } });
      await Collection.updateOne(
        { userId: req.user._id, name: "All Saved" },
        { $pull: { posts: postIdStr } }
      );
    }

    const populated = await Collection.findById(collection._id).populate("posts", "image text createdAt");
    res.status(200).json({ message: "Post removed from collection", collection: populated || collection });
  } catch (error) {
    console.error("REMOVE FROM COLLECTION ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCollectionPosts = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid collection ID" });
    }

    const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id })
      .populate({
        path: "posts",
        populate: { path: "userId", select: "username profilePicture" }
      });
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    const posts = (collection.posts || [])
      .filter(p => p && typeof p === "object" && p._id)
      .map(p => ({
        ...(typeof p.toObject === "function" ? p.toObject() : p),
        isSaved: true
      }));

    res.status(200).json({ collection: { _id: collection._id, name: collection.name }, posts });
  } catch (error) {
    console.error("GET COLLECTION POSTS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};
