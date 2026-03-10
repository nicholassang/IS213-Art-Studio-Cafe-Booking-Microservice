import { useNavigate } from "react-router-dom"

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: 40 }}>
      <h1>Home Page</h1>
      <p>Welcome to the booking app.</p>
      <button onClick={() => navigate("/booking")}>Go to Booking</button>
      <button onClick={() => navigate("/login")} style={{ marginLeft: 10 }}>
        Go to Login
      </button>
    </div>
  )
}