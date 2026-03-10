import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import { useAuth } from "../features/auth/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>; 

  return <RouterProvider router={router(user)} />;
}