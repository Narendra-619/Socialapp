import { useState, useContext } from "react";
import { Card, CardHeader, CardContent, CardActions, Avatar, IconButton, Typography, Box } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import API from "../utils/api";
import CommentSection from "./CommentSection";
import { AuthContext } from "../context/AuthContext";

export default function PostCard({ post, refresh }) {
  const { user } = useContext(AuthContext);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await API.delete(`/posts/${post._id}`);
      // Refresh feed after deletion
      if (refresh) refresh();
    } catch (err) {
      // Deletion failed silently for user
    }
  };
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(user ? post.likes?.includes(user.id) : false);
  const [showComments, setShowComments] = useState(false);

  /**
   * Toggle Like with Optimistic UI Update
   */
  const handleLike = async () => {
    // Save current state for potential rollback
    const prevLiked = isLiked;
    const prevCount = likesCount;
    
    // Update UI immediately (Optimistic)
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      const res = await API.post(`/posts/${post._id}/like`);
      // Update with server's source of truth for counts
      if (res.data && res.data.likesCount !== undefined) {
        setLikesCount(res.data.likesCount);
      }
    } catch (err) {
      // Rollback UI on network/server error
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const username = post.userId?.username || "Unknown User";
  const initial = username.charAt(0).toUpperCase();

  return (
    <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 2 }}>
      <CardHeader
        avatar={<Avatar sx={{ bgcolor: "primary.main" }}>{initial}</Avatar>}
        action={
          user && user.id === post.userId?._id && (
            <IconButton onClick={handleDelete} color="error" size="small">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )
        }
        title={<Typography fontWeight="bold">{username}</Typography>}
        subheader={new Date(post.createdAt).toLocaleString()}
      />
      <CardContent sx={{ pt: 1, pb: 2, px: 2 }}>
        {post.text && <Typography variant="body1">{post.text}</Typography>}
        {post.image && (
          <Box sx={{ mt: post.text ? 2 : 0 }}>
            <img src={post.image} alt="post content" style={{ width: "100%", maxHeight: "500px", objectFit: "contain", borderRadius: 8, backgroundColor: "#f0f0f0" }} />
          </Box>
        )}
      </CardContent>
      <CardActions disableSpacing sx={{ display: "flex", px: 2, pb: 1.5, pt: 1.5, borderTop: "1px solid #f0f0f0" }}>
        <Box sx={{ display: "flex", alignItems: "center", mr: 3 }}>
          <IconButton onClick={handleLike} color={isLiked ? "error" : "default"} size="small" sx={{ mr: 0.5 }}>
            {isLiked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "500" }}>
            {likesCount}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={() => setShowComments(!showComments)} size="small" color="default" sx={{ mr: 0.5 }}>
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "500" }}>
            {post.comments?.length || 0}
          </Typography>
        </Box>
      </CardActions>
      
      {showComments && (
        <Box sx={{ px: 2, pb: 2 }}>
          <CommentSection post={post} />
        </Box>
      )}
    </Card>
  );
}