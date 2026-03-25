import { useState } from "react";
import { TextField, Button, Paper, Box, IconButton, Tooltip } from "@mui/material";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import CloseIcon from "@mui/icons-material/Close";
import API from "../utils/api";

/**
 * CreatePost component allows users to create and submit new posts,
 * optionally including an image.
 *
 * @param {object} props - Component props.
 * @param {function} props.refresh - Callback function to refresh the feed after a successful post.
 */
export default function CreatePost({ refresh }) {
  // State to manage the text content of the post
  const [text, setText] = useState("");
  // State to store the Base64 encoded image string for the post
  const [image, setImage] = useState("");
  // State to indicate if the post submission is in progress
  const [loading, setLoading] = useState(false);

  /**
   * Handles the change event for the image input.
   * Reads the selected image file and converts it into a Base64 data URL.
   * This Base64 string can then be sent to the backend for storage.
   *
   * @param {Event} e - The change event from the file input.
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Set the image state to the Base64 string
        setImage(reader.result);
      };
      // Read the file as a data URL (Base64 encoded string)
      reader.readAsDataURL(file);
    }
  };

  /**
   * Submits the post to the API.
   * The post can include text, an image, or both.
   * Clears the input fields and triggers a feed refresh upon success.
   */
  const handlePost = async () => {
    // Prevent posting if both text and image are empty
    if (!text.trim() && !image) return;

    setLoading(true); // Indicate that the post submission is in progress
    try {
      // Send the post data (text and Base64 image) to the API
      await API.post("/posts", { text, image });
      // Clear inputs upon successful post creation
      setText("");
      setImage("");
      // Refresh the parent component (e.g., Feed) to show the new post
      refresh();
    } catch (err) {
      // Handle post creation error (e.g., display an error message)
      console.error("Error creating post:", err);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 1 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Text input for the post content */}
        <TextField
          placeholder="What's on your mind?"
          multiline
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          variant="outlined"
          fullWidth
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        
        {image && (
          <Box sx={{ position: "relative", width: "fit-content" }}>
            <img src={image} alt="preview" style={{ maxHeight: 200, borderRadius: 8 }} />
            <IconButton 
              size="small" 
              onClick={() => setImage("")} 
              sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(255,255,255,0.7)" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Tooltip title="Upload Image">
            <IconButton color="primary" component="label">
              <input hidden accept="image/*" type="file" onChange={handleImageChange} />
              <PhotoCamera />
            </IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            onClick={handlePost} 
            disabled={(!text.trim() && !image) || loading}
            sx={{ borderRadius: 3, px: 3, fontWeight: "bold" }}
          >
            Post
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}