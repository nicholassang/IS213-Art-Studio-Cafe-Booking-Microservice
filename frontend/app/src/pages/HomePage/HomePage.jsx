import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BookingPage from "../../components/BookingFlowPage";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 40 }}>
      <h1>Home Page</h1>
      {user ? <p>Welcome, {user.username}!</p> : <p>Please log in.</p>}
      {!user && <>
        <button
            onClick={() => (navigate("/login"))}
            style={{ marginLeft: 10 }}
        >
            Login
        </button>
        <button
            onClick={() => (navigate("/register"))}
            style={{ marginLeft: 10 }}
        >
            Register
        </button>
      </>
        }
      {user && <button onClick={() => logout()} style={{ marginLeft: 10 }}>Logout</button>}

      {user && <BookingPage />}

    </div>
  );
}