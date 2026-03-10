import { useState } from "react";
import { createBooking } from "./api";

export function useBookingApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const submitBooking = async (bookingData) => {
    setLoading(true);
    setError(null);
    setResponse(null); // clear any previous result before making a new request

    try {
      const res = await createBooking(bookingData);
      setResponse(res);
      return res;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBookings();
      setResponse(res);
      return res;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { submitBooking, fetchBookings, loading, error, response };
}