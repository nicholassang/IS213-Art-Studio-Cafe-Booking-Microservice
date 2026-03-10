import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingApi } from "../../features/bookings/hooks.js";

export default function BookingPage() {
  const navigate = useNavigate();
  const { submitBooking, loading, error, response } = useBookingApi();

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [numPeople, setNumPeople] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // clear previous response so success message only appears when this call returns
    // (hook keeps last response indefinitely)
    setStartTime(""); setEndTime(""); setNumPeople(1);
    const res = await submitBooking({ startTime, endTime, numPeople });
    if (res?.success) {
      alert("Booking successful!");
    } else {
      alert("Booking failed!");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Booking Page</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300 }}>
        <label>
          Start Time:
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </label>
        <label>
          End Time:
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </label>
        <label>
          Number of People:
          <input type="number" value={numPeople} min={1} onChange={(e) => setNumPeople(Number(e.target.value))} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Booking"}</button>
        {error && <p style={{ color: "red" }}>Error submitting booking</p>}
        {response?.success && <p style={{ color: "green" }}>Booking successful!</p>}
      </form>

      <button onClick={() => navigate("/")}>Back to Home</button>
    </div>
  );
}