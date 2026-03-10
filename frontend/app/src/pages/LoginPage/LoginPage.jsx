import { useNavigate } from "react-router-dom"

export function LoginPage() {

  const navigate = useNavigate()

  return (
    <div style={{ padding: 40 }}>
      <h1>Login Page</h1>

      <p>Please log in.</p>

      <button onClick={() => navigate("/")}>
        Back to Home
      </button>

      <button onClick={() => navigate("/booking")} style={{ marginLeft: 10 }}>
        Go to Booking
      </button>
    </div>
  )
}