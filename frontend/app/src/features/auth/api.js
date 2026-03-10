import apiClient from "../../services/apiClient";

export const loginUser = async (username, password) => {
  const res = await apiClient.post("/login", { username, password });
  return res.data;
};

export const registerUser = async (username, password) => {
  const res = await apiClient.post("/register", { username, password });
  return res.data;
};

export const logoutUser = async () => {
  const res = await apiClient.post("/logout");
  return res.data;
};

export const getProfile = async () => {
  const res = await apiClient.get("/profile");
  return res.data;
};