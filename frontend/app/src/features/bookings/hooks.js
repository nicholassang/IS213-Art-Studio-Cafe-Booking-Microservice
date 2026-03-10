import { useState } from "react";
import { createBooking } from "./api";

export function useBookingApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const submitBooking = async (bookingData) => {
    setLoading(true);
    setError(null);

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

  return { submitBooking, loading, error, response };
}