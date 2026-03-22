// src/features/auth/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, loginUser, registerUser, logoutUser } from "../api/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // fetch session on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        if (res.success) setUser({ username: res.username });
        else setUser(null); // clear stale user if not authenticated
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const login = async (username, password) => {
    const res = await loginUser(username, password);
    if (res.success) setUser({ username });
    return res;
  };

  const register = async (username, password) => {
    const res = await registerUser(username, password);
    if (res.success) setUser({ username });
    return res;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use context
export const useAuth = () => useContext(AuthContext);