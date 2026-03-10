import { useNavigate } from "react-router-dom"

export function BookingPage() {

  const navigate = useNavigate()

  return (
    <div style={{ padding: 40 }}>
      <h1>Booking Page</h1>

      <p>Book your appointments here.</p>

      <button onClick={() => navigate("/")}>
        Back to Home
      </button>

      <button onClick={() => navigate("/login")} style={{ marginLeft: 10 }}>
        Go to Login
      </button>
    </div>
  )
}