import apiClient from "../../services/apiClient";

export const createBooking = async (bookingData) => {
  const res = await apiClient.post("/bookings", bookingData);
  return res.data;
};

export const getBookings = async () => {
  const res = await apiClient.get("/bookings");
  return res.data;
};
