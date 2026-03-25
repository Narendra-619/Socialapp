import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If token exists and we are on auth pages, redirect to feed
    if (token) {
      if (window.location.pathname === "/" || window.location.pathname === "/register") {
        navigate("/feed");
      }
    }
  }, [token, navigate]);

  /**
   * Handle user login: stores token and navigates to the feed
   */
  const loginAuth = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    navigate("/feed");
  };

  /**
   * Handle user logout: clears authorization state and redirects
   */
  const logoutAuth = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ token, user, loginAuth, logoutAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
