import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;700&display=swap');

  :root {
    --bg: #faf7f2;
    --surface: #fffdf9;
    --surface-2: #f5efe6;
    --text: #241c17;
    --muted: #7d7468;
    --line: #e6ddd1;
    --accent: #c8a97e;
    --accent-deep: #b38d5e;
    --shadow: 0 12px 30px rgba(42, 30, 18, 0.08);
  }

  .register-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    min-height: 100vh;
  }

  .register-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.86rem;
    font-weight: 600;
    color: #6f6558;
    background: #fffaf4;
    border: 1px solid var(--line);
    padding: 10px 16px;
    border-radius: 999px;
    cursor: pointer;
    margin-bottom: 24px;
    transition: background 0.2s, color 0.2s, transform 0.2s;
    letter-spacing: 0.02em;
  }

  .register-back:hover {
    background: var(--text);
    color: #fff;
    transform: translateY(-1px);
  }

  .register-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 42px;
    align-items: stretch;
  }

  .register-hero {
    position: relative;
    overflow: hidden;
    border-radius: 28px;
    min-height: 640px;
    background:
      linear-gradient(rgba(36, 28, 23, 0.18), rgba(36, 28, 23, 0.28)),
      url("https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80") center/cover no-repeat;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    display: flex;
    align-items: flex-end;
  }

  .register-hero-content {
    padding: 34px 30px;
    color: #fffdf9;
    width: 100%;
    background: linear-gradient(to top, rgba(30, 23, 19, 0.62), rgba(30, 23, 19, 0.08));
  }

  .register-hero-badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(255, 250, 244, 0.16);
    border: 1px solid rgba(255, 247, 238, 0.24);
    backdrop-filter: blur(8px);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .register-hero-title {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    line-height: 1.08;
    margin: 0 0 14px;
    font-weight: 700;
  }

  .register-hero-text {
    margin: 0;
    font-size: 0.98rem;
    line-height: 1.8;
    max-width: 520px;
    color: rgba(255, 251, 245, 0.92);
  }

  .register-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 36px 32px;
    box-shadow: var(--shadow);
    align-self: center;
  }

  .register-badge {
    display: inline-block;
    background: #f4ece1;
    color: #7a664d;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .register-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.5rem;
    line-height: 1.1;
    margin: 0 0 12px;
    color: var(--text);
  }

  .register-divider {
    width: 54px;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    margin-bottom: 18px;
  }

  .register-subtitle {
    color: var(--muted);
    line-height: 1.75;
    font-size: 0.96rem;
    margin: 0 0 28px;
  }

  .register-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .register-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .register-label {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #8f8172;
    font-weight: 700;
  }

  .register-input {
    width: 100%;
    border: 1px solid var(--line);
    background: #fffaf4;
    color: var(--text);
    border-radius: 16px;
    padding: 14px 16px;
    font-size: 0.96rem;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    box-sizing: border-box;
  }

  .register-input:focus {
    border-color: #d8c4a5;
    background: #fffdf9;
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.14);
  }

  .register-note {
    background: #fcf8f2;
    border: 1px solid var(--line);
    color: var(--muted);
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .register-error {
    background: #fff2f0;
    color: #b42318;
    border: 1px solid #f3c7c2;
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .register-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  .register-btn {
    width: 100%;
    padding: 15px 22px;
    background: var(--text);
    color: #faf8f5;
    border: none;
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: background 0.2s, transform 0.15s;
  }

  .register-btn:hover {
    background: var(--accent-deep);
    transform: translateY(-1px);
  }

  .register-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .register-secondary-btn {
    width: 100%;
    padding: 15px 22px;
    background: #fffaf3;
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, border-color 0.2s;
  }

  .register-secondary-btn:hover {
    background: #f6eee2;
    transform: translateY(-1px);
  }

  .register-footer {
    margin-top: 20px;
    text-align: center;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .register-footer button {
    background: none;
    border: none;
    color: var(--accent-deep);
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }

  .register-footer button:hover {
    text-decoration: underline;
  }

  @media (max-width: 980px) {
    .register-shell {
      grid-template-columns: 1fr;
      gap: 26px;
    }

    .register-hero {
      min-height: 360px;
    }
  }

  @media (max-width: 640px) {
    .register-card {
      padding: 26px 20px;
      border-radius: 22px;
    }

    .register-hero {
      min-height: 300px;
      border-radius: 22px;
    }

    .register-title {
      font-size: 2rem;
    }

    .register-hero-title {
      font-size: 2.2rem;
    }
  }
`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await register(username, password);
    if (res.success) navigate("/");
  };

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="register-root">
          <button className="register-back" onClick={() => navigate("/")}>
            ← Back to home
          </button>

          <div className="register-shell">
            <div className="register-hero">
              <div className="register-hero-content">
                <span className="register-hero-badge">Join the Studio</span>
                <h1 className="register-hero-title">
                  Create your account and start booking artful café experiences.
                </h1>
                <p className="register-hero-text">
                  Discover hands-on workshops, cosy café moments, and creative sessions designed
                  for friends, dates, and memorable gatherings in one elegant booking space.
                </p>
              </div>
            </div>

            <div className="register-card">
              <span className="register-badge">New Member</span>
              <h1 className="register-title">Create your account</h1>
              <div className="register-divider" />
              <p className="register-subtitle">
                Sign up to save your favourite experiences, manage bookings, and enjoy a smooth
                studio café reservation journey.
              </p>

              <form onSubmit={handleSubmit} className="register-form">
                <div className="register-field">
                  <label className="register-label">Username</label>
                  <input
                    className="register-input"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="register-field">
                  <label className="register-label">Password</label>
                  <input
                    className="register-input"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="register-note">
                  Your account lets you book activities, return to saved experiences, and continue
                  your café art journey anytime.
                </div>

                {error && (
                  <div className="register-error">
                    Error: {error.message || "Unable to register. Please try again."}
                  </div>
                )}

                <div className="register-actions">
                  <button className="register-btn" type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Create Account"}
                  </button>

                  <button
                    className="register-secondary-btn"
                    type="button"
                    onClick={() => navigate("/login")}
                  >
                    Back to Login
                  </button>
                </div>
              </form>

              <div className="register-footer">
                Already have an account?{" "}
                <button type="button" onClick={() => navigate("/login")}>
                  Sign in here
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}