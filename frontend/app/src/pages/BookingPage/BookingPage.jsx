import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingApi } from "../../features/bookings/hooks";

export function BookingPage() {
  const navigate = useNavigate();
  const { submitBooking, loading, error, response } = useBookingApi();

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [numPeople, setNumPeople] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bookingData = { startTime, endTime, numPeople };
    const res = await submitBooking(bookingData);
    if (res) {
      alert("Booking submitted successfully!");
      setStartTime("");
      setEndTime("");
      setNumPeople(1);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Booking Page</h1>

      <form style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={handleSubmit}>
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

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Booking"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Error submitting booking</p>}
      {response && <p style={{ color: "green" }}>Booking successful!</p>}

      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    </div>
  );
}