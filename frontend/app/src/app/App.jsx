import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ChatWidget from "../components/ChatWidget.jsx";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <RouterProvider router={router(user, ChatWidget)} />
    </>
  );
}

