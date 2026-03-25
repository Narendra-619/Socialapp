import { useEffect, useState, useContext } from "react";
import { Container, Typography, Box, AppBar, Toolbar, Button, CircularProgress } from "@mui/material";
import { AuthContext } from "../context/AuthContext";
import API from "../utils/api";
import PostCard from "../components/PostCard";
import CreatePost from "../components/CreatePost";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logoutAuth } = useContext(AuthContext);

  /**
   * Fetch all posts from the backend server
   */
  const fetchPosts = async () => {
    try {
      const res = await API.get("/posts");
      setPosts(res.data);
    } catch (err) {
      // Failed to load posts into feed
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch on component load
  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh", pb: 4 }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight="bold">
            SocialApp
          </Typography>
          <Button color="inherit" onClick={logoutAuth} sx={{ fontWeight: "600" }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <CreatePost refresh={fetchPosts} />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          posts.map((post) => (
            <PostCard key={post._id} post={post} refresh={fetchPosts} />
          ))
        )}
      </Container>
    </Box>
  );
}