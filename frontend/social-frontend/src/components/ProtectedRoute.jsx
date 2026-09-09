import { useContext, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token, logoutAuth } = useContext(AuthContext);

  const isExpired = useMemo(() => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      // eslint-disable-next-line react-hooks/purity
      return typeof payload.exp === "number" ? payload.exp * 1000 < Date.now() : true;
    } catch {
      return true;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        logoutAuth();
      }
    } catch {
      logoutAuth();
    }
  }, [token, logoutAuth]);

  if (!token || isExpired) {
    return <Navigate to="/" replace />;
  }

  return children;
}
