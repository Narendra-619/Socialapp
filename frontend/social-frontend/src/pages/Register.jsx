import { useState } from "react";
import { TextField, Button, Card, CardContent, Typography, Alert, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      setError("");
      await API.post("/auth/register", { username, email, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f5f5f5" }}>
      <Card sx={{ maxWidth: 400, width: "100%", p: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom textAlign="center" fontWeight="bold">
            Create Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField fullWidth label="Username" margin="normal" variant="outlined"
            value={username} onChange={(e) => setUsername(e.target.value)} />

          <TextField fullWidth label="Email" margin="normal" variant="outlined"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <TextField fullWidth label="Password" type="password" margin="normal" variant="outlined"
            value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button fullWidth variant="contained" size="large" onClick={handleRegister} sx={{ mt: 2, mb: 2, borderRadius: 2 }}>
            Register
          </Button>

          <Typography variant="body2" textAlign="center">
            Already have an account? <Button color="primary" onClick={() => navigate("/")}>Log In</Button>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}