import { useState, useContext } from "react";
import { TextField, Button, Card, CardContent, Typography, Alert, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loginAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setError("");
      const res = await API.post("/auth/login", { email, password });
      loginAuth(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f5f5f5" }}>
      <Card sx={{ maxWidth: 400, width: "100%", p: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom textAlign="center" fontWeight="bold">
            Welcome Back
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <TextField fullWidth label="Email" type="email" margin="normal" variant="outlined" required
              value={email} onChange={(e) => setEmail(e.target.value)} />

            <TextField fullWidth label="Password" type="password" margin="normal" variant="outlined" required
              value={password} onChange={(e) => setPassword(e.target.value)} />

            <Button fullWidth variant="contained" size="large" sx={{ mt: 2, mb: 2, borderRadius: 2 }} type="submit">
              Login
            </Button>
          </form>

          <Typography variant="body2" textAlign="center">
            Don't have an account? <Button color="primary" onClick={() => navigate("/register")}>Sign Up</Button>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}