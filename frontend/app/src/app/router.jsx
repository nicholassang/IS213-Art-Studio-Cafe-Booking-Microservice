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
import BookingPage from "../pages/BookingPage/CalendarBooking.jsx";

// Protected route wrapper
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

    { path: "/booking", element: <BookingPage /> },
    // AI quiz
   // {
      //path: "/quiz",
      //element: <Questionnaire />
    //},
    // quiz result
    //{
      //path: "/quiz/result/:submissionId",
      //element: <Recommendation />
    //},

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
      path: "/saved-experiences",
      element: <SavedExperiences />
    },
    {
      path: "/payment",
      element: <PaymentPage />,
    },

    { path: "/quiz/result/:submissionId", element: <ResultPage /> },
    { path: "/my-recommendations", element: <PastRecommendations /> },
  ]);

