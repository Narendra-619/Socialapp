import axios from "axios";

// Centralized API configuration using Axios
const API = axios.create({
  baseURL: "https://socialapp-k7hu.onrender.com/api"
});

// Request Interceptor: Injects Bearer token automatically if it exists in local storage
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;