import { createBrowserRouter, Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage/HomePage.jsx";
import LoginPage from "../pages/LoginPage/LoginPage.jsx";
import RegisterPage from "../pages/RegisterPage/RegisterPage.jsx";
import BookingPage from "../pages/BookingPage/BookingPage.jsx";

const Protected = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const router = (user) =>
  createBrowserRouter([
    { path: "/", element: <HomePage /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegisterPage /> },
    {
      path: "/booking",
      element: (
        <Protected user={user}>
          <BookingPage />
        </Protected>
      ),
    },
  ]);