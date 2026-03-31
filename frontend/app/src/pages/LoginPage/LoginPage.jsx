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

  .login-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    min-height: 100vh;
  }

  .login-back {
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

  .login-back:hover {
    background: var(--text);
    color: #fff;
    transform: translateY(-1px);
  }

  .login-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 42px;
    align-items: stretch;
  }

  .login-hero {
    position: relative;
    overflow: hidden;
    border-radius: 28px;
    min-height: 640px;
    background:
      linear-gradient(rgba(36, 28, 23, 0.18), rgba(36, 28, 23, 0.28)),
      url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80") center/cover no-repeat;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    display: flex;
    align-items: flex-end;
  }

  .login-hero-content {
    padding: 34px 30px;
    color: #fffdf9;
    width: 100%;
    background: linear-gradient(to top, rgba(30, 23, 19, 0.62), rgba(30, 23, 19, 0.08));
  }

  .login-hero-badge {
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

  .login-hero-title {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    line-height: 1.08;
    margin: 0 0 14px;
    font-weight: 700;
  }

  .login-hero-text {
    margin: 0;
    font-size: 0.98rem;
    line-height: 1.8;
    max-width: 520px;
    color: rgba(255, 251, 245, 0.92);
  }

  .login-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 36px 32px;
    box-shadow: var(--shadow);
    align-self: center;
  }

  .login-badge {
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

  .login-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.5rem;
    line-height: 1.1;
    margin: 0 0 12px;
    color: var(--text);
  }

  .login-divider {
    width: 54px;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    margin-bottom: 18px;
  }

  .login-subtitle {
    color: var(--muted);
    line-height: 1.75;
    font-size: 0.96rem;
    margin: 0 0 28px;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .login-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .login-label {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #8f8172;
    font-weight: 700;
  }

  .login-input {
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

  .login-input:focus {
    border-color: #d8c4a5;
    background: #fffdf9;
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.14);
  }

  .login-error {
    background: #fff2f0;
    color: #b42318;
    border: 1px solid #f3c7c2;
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .login-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  .login-btn {
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

  .login-btn:hover {
    background: var(--accent-deep);
    transform: translateY(-1px);
  }

  .login-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .login-secondary-btn {
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

  .login-secondary-btn:hover {
    background: #f6eee2;
    transform: translateY(-1px);
  }

  .login-footer {
    margin-top: 20px;
    text-align: center;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .login-footer button {
    background: none;
    border: none;
    color: var(--accent-deep);
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }

  .login-footer button:hover {
    text-decoration: underline;
  }

  @media (max-width: 980px) {
    .login-shell {
      grid-template-columns: 1fr;
      gap: 26px;
    }

    .login-hero {
      min-height: 360px;
    }
  }

  @media (max-width: 640px) {
    .login-card {
      padding: 26px 20px;
      border-radius: 22px;
    }

    .login-hero {
      min-height: 300px;
      border-radius: 22px;
    }

    .login-title {
      font-size: 2rem;
    }

    .login-hero-title {
      font-size: 2.2rem;
    }
  }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(username, password);
    if (res.success) navigate("/");
  };

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="login-root">
          <button className="login-back" onClick={() => navigate("/")}>
            ← Back to home
          </button>

          <div className="login-shell">
            <div className="login-hero">
              <div className="login-hero-content">
                <span className="login-hero-badge">Art Café Experience</span>
                <h1 className="login-hero-title">
                  Book creative moments, coffee dates, and cosy studio sessions.
                </h1>
                <p className="login-hero-text">
                  Sign in to explore curated art experiences, reserve your preferred time slots,
                  and enjoy a warm café-inspired booking journey made for memorable gatherings.
                </p>
              </div>
            </div>

            <div className="login-card">
              <span className="login-badge">Welcome Back</span>
              <h1 className="login-title">Login to your account</h1>
              <div className="login-divider" />
              <p className="login-subtitle">
                Continue your art studio and café booking journey with a calm, elegant experience.
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label className="login-label">Username</label>
                  <input
                    className="login-input"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="login-error">
                    Error: {error.message || "Unable to login. Please try again."}
                  </div>
                )}

                <div className="login-actions">
                  <button className="login-btn" type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </button>

                  <button
                    className="login-secondary-btn"
                    type="button"
                    onClick={() => navigate("/register")}
                  >
                    Create an Account
                  </button>
                </div>
              </form>

              <div className="login-footer">
                New here?{" "}
                <button type="button" onClick={() => navigate("/register")}>
                  Join the studio
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}