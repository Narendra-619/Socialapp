import Post from "../models/Post.js";

/**
 * Create a new social post
 */
export const createPost = async (req, res) => {
  try {
    const { text, image } = req.body;
    
    // Validate that post has content
    if (!text && !image) {
      return res.status(400).json({
        error: "Post must have text or image"
      });
    }

    // Initialize new post with user ID from protection middleware
    const post = new Post({
      userId: req.user._id, 
      text,
      image
    });

    await post.save();

    res.status(201).json({
      message: "Post created",
      post
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};

/**
 * Fetch all posts sorted by newest first
 */
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "username")  // Include username of author
      .populate("comments.userId", "username") // Include usernames of commenters
      .sort({ createdAt: -1 });

    res.status(200).json(posts);

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};



/**
 * Handle Like/Unlike logic for a post
 */
export const toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    // Check if user has already liked the post
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Remove user ID from likes array to unlike
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Add user ID to likes array to like
      post.likes.push(userId);
    }

    await post.save();

    res.status(200).json({
      message: isLiked ? "Post unliked" : "Post liked",
      likesCount: post.likes.length
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
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

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    // Create comment object
    const newComment = {
      userId: req.user._id,
      text
    };

    // Push new comment to the comments array
    post.comments.push(newComment);

    await post.save();

    res.status(200).json({
      message: "Comment added",
      comments: post.comments
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
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
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Not authorized to delete this post"
      });
    }

    await post.deleteOne();

    res.status(200).json({
      message: "Post deleted"
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
};