import axios from "axios";

const apiClient = axios.create({
  // use the same host name the browser actually uses, not 127.0.0.1
  // avoiding a different hostname keeps the session cookie in the "same-site" scope
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;