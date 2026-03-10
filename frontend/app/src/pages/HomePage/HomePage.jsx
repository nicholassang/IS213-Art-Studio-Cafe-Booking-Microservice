import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  console.log("homepage: user:", user);

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
      {user && <button
        onClick={() => (navigate("/booking"))}
        style={{ marginLeft: 10 }}
      >
        Booking
      </button>}
    </div>
  );
}