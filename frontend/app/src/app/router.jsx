import { createBrowserRouter } from "react-router-dom"

import HomePage from "../pages/HomePage/HomePage"
/* import { BookingPage } from "../pages/BookingPage/BookingPage"
import { LoginPage } from "../pages/LoginPage/LoginPage" */

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />
  },
/*   {
    path: "/booking",
    element: <BookingPage />
  },
  {
    path: "/login",
    element: <LoginPage />
  } */
])