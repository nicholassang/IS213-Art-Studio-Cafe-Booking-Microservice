import { createBrowserRouter, Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage/HomePage.jsx";
import LoginPage from "../pages/LoginPage/LoginPage.jsx";
import RegisterPage from "../pages/RegisterPage/RegisterPage.jsx";
import ActivityList from "../pages/ActivityPage/ActivityList.jsx";
import ActivityDetail from "../pages/ActivityPage/ActivityDetail.jsx";
import FoodMenu from "../pages/FoodPage/FoodList.jsx";
import FoodDetail from "../pages/FoodPage/FoodDetail.jsx";
import Cart from "../pages/FoodPage/Cart.jsx";
import Questionnaire from "../pages/RecommendationPage/Questionnaire.jsx"
import Recommendation from "../pages/RecommendationPage/Recommendation.jsx"
import SavedExperiences from "../pages/ActivityPage/SavedExperiences.jsx";


// Protected route wrapper
const Protected = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const router = (user) =>
  createBrowserRouter([
    // home
    { path: "/", element: <HomePage /> },
    // auth 
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegisterPage /> },
    {
      path: "/activities",
      element: <ActivityList />,
    },
    {
      path: "/activity/:id",
      element: <ActivityDetail />,
    },
    // AI quiz
    {
      path: "/quiz",
      element: <Questionnaire />
    },
    // quiz result
    {
      path: "/quiz/result/:submissionId",
      element: <Recommendation />
    },

    {
      path: "/menu",
      element: <FoodMenu />,
    },
    {
      path: "/menu/:id",
      element: <FoodDetail />
    },
    {
      path: "/cart",
      element: <Cart />
    },
    {
      path: "/cart",
      element: <Cart />
    },
    {
      path: "/saved-experiences",
      element: <SavedExperiences />
    }
  ]);

