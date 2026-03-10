import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await register(username, password);
    if (res.success) navigate("/");
    else alert(res.message || "Registration failed");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Register</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300 }}>
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? "Registering..." : "Register"}</button>
        {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      </form>
      <button onClick={() => navigate("/login")} style={{ marginTop: 10 }}>Go to Login</button>
    </div>
  );
}