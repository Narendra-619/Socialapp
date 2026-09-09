import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      return {
        ...parsed,
        _id: parsed._id || parsed.id,
        id: parsed.id || parsed._id
      };
    } catch {
      return null;
    }
  });
  const [showWelcome, setShowWelcome] = useState(false);
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
   * Handle user login: stores token and updates state (useEffect redirects to /feed)
   */
  const loginAuth = useCallback((newToken, userData, isNew = false) => {
    const normalized = userData ? {
      ...userData,
      _id: userData._id || userData.id,
      id: userData.id || userData._id
    } : null;
    localStorage.setItem("token", newToken);
    if (normalized) {
      localStorage.setItem("user", JSON.stringify(normalized));
    }
    setToken(newToken);
    setUser(normalized);
    if (isNew) {
      setShowWelcome(true);
    }
  }, []);

  /**
   * Close the welcome modal
   */
  const closeWelcome = useCallback(() => setShowWelcome(false), []);

  /**
   * Handle user logout: clears authorization state and redirects
   */
  const logoutAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    navigate("/");
  }, [navigate]);

  /**
   * Update user details locally and in storage
   */
  const updateUser = useCallback((updatedData) => {
    setUser((prevUser) => {
      const newUser = {
        ...prevUser,
        ...updatedData,
        _id: updatedData._id || updatedData.id || prevUser?._id || prevUser?.id,
        id: updatedData.id || updatedData._id || prevUser?.id || prevUser?._id,
      };
      localStorage.setItem("user", JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    loginAuth,
    logoutAuth,
    updateUser,
    showWelcome,
    closeWelcome
  }), [token, user, showWelcome, loginAuth, logoutAuth, updateUser, closeWelcome]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
