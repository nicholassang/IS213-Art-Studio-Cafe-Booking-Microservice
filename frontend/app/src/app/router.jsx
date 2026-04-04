import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import HomePage from "../pages/HomePage/HomePage.jsx";
import LoginPage from "../pages/LoginPage/LoginPage.jsx";
import RegisterPage from "../pages/RegisterPage/RegisterPage.jsx";
import ActivityList from "../pages/ActivityPage/ActivityList.jsx";
import ActivityDetail from "../pages/ActivityPage/ActivityDetail.jsx";
import FoodMenu from "../pages/FoodPage/FoodList.jsx";
import FoodDetail from "../pages/FoodPage/FoodDetail.jsx";
import Cart from "../pages/FoodPage/Cart.jsx";
import SavedExperiences from "../pages/ActivityPage/SavedExperiences.jsx";
import PaymentPage from "../pages/PaymentPage/PaymentPage.jsx";
import ResultPage from "../pages/RecommendationPage/ResultPage.jsx";
import PastRecommendations from "../pages/RecommendationPage/PastRecommendations.jsx";

const Protected = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const LayoutWithChat = ({ ChatWidget }) => (
  <>
    <Outlet />
    <ChatWidget />
  </>
);

export const router = (user, ChatWidget) =>
  createBrowserRouter([
    {
      element: <LayoutWithChat ChatWidget={ChatWidget} />,
      children: [
        { path: "/",                          element: <HomePage /> },
        { path: "/login",                     element: <LoginPage /> },
        { path: "/register",                  element: <RegisterPage /> },
        { path: "/activities",                element: <ActivityList /> },
        { path: "/activity/:id",              element: <ActivityDetail /> },
        { path: "/menu",                      element: <FoodMenu /> },
        { path: "/menu/:id",                  element: <FoodDetail /> },
        { path: "/cart",                      element: <Cart /> },
        { path: "/saved-experiences",         element: <SavedExperiences /> },
        { path: "/payment",                   element: <PaymentPage /> },
        { path: "/quiz/result/:submissionId", element: <ResultPage /> },
        { path: "/my-recommendations",     element: <PastRecommendations /> },
      ],
    },
  ]);
