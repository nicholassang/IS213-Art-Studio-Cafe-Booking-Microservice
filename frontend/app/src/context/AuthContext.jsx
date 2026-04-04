// src/features/auth/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, loginUser, registerUser, logoutUser } from "../api/auth";

const AuthContext = createContext();

const normalizeAuthError = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  const message = error?.response?.data?.message;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (detail && typeof detail === "object") {
    return detail.message || detail.downstream_response?.detail || fallbackMessage;
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallbackMessage;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(null);

  // fetch session on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        if (res.success) {
          setUser({ username: res.username, email: res.email });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setSessionLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const login = async (username, password) => {
    setAuthLoading(true);
    setError(null);

    try {
      const res = await loginUser(username, password);
      if (res.success) {
        const resolvedUsername = res.user?.username || res.username || username;
        setUser({ username: resolvedUsername, email: res.user?.email || res.email || null });
        return res;
      }

      setError({ message: res.message || "Unable to login. Please try again." });
      return res;
    } catch (authError) {
      const message = normalizeAuthError(authError, "Unable to login. Please try again.");
      setError({ message });
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (username, password) => {
    setAuthLoading(true);
    setError(null);

    try {
      const res = await registerUser(username, password);
      if (res.success) {
        const resolvedUsername = res.user?.username || res.username || username;
        setUser({ username: resolvedUsername, email: res.user?.email || res.email || null });
        return res;
      }

      setError({ message: res.message || "Unable to register. Please try again." });
      return res;
    } catch (authError) {
      const message = normalizeAuthError(authError, "Unable to register. Please try again.");
      setError({ message });
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: sessionLoading || authLoading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use context
export const useAuth = () => useContext(AuthContext);