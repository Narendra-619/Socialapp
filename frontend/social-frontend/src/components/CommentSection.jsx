import { useState } from "react";
import { Box, Typography, TextField, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider } from "@mui/material";
import API from "../utils/api";

export default function CommentSection({ post }) {
  const [comments, setComments] = useState(post.comments || []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleComment = async () => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const res = await API.post(`/posts/${post._id}/comment`, { text });
      setComments(res.data.comments);
      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      {comments.length > 0 && (
        <List dense sx={{ width: '100%', bgcolor: 'background.paper', mb: 2, borderRadius: 1, border: '1px solid #eee' }}>
          {comments.map((c, index) => {
            const username = c.userId?.username || "Unknown";
            return (
              <Box key={c._id}>
                <ListItem alignItems="flex-start" sx={{ py: 1 }}>
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                      {username.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="subtitle2" fontWeight="bold">{username}</Typography>}
                    secondary={<Typography variant="body2" color="text.primary">{c.text}</Typography>}
                  />
                </ListItem>
                {index < comments.length - 1 && <Divider variant="inset" component="li" />}
              </Box>
            );
          })}
        </List>
      )}

      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Write a comment..."
          variant="outlined"
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5 } }}
        />
        <Button 
          variant="contained" 
          size="small" 
          onClick={handleComment}
          disabled={!text.trim() || loading}
          sx={{ borderRadius: 5, px: 3 }}
        >
          Post
        </Button>
      </Box>
    </Box>
  );
}