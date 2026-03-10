import apiClient from "../../services/apiClient";

export const createBooking = async (bookingData) => {
  const response = await apiClient.post("/bookings", bookingData);
  return response.data;
};