import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BookingPage from "../../components/BookingFlowPage";
import Layout from "../../components/Layout";
import heroImage from "./art-booking-workshop.png";

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

  .home-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .home-hero {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 28px;
    align-items: stretch;
  }

  .home-hero-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 38px 34px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .home-badge {
    display: inline-block;
    width: fit-content;
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

  .home-title {
    font-family: 'Playfair Display', serif;
    font-size: 3.2rem;
    line-height: 1.05;
    margin: 0 0 14px;
    color: var(--text);
  }

  .home-divider {
    width: 56px;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    margin-bottom: 18px;
  }

  .home-subtitle {
    color: var(--muted);
    line-height: 1.8;
    font-size: 1rem;
    margin: 0 0 26px;
    max-width: 620px;
  }

  .home-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .home-btn-primary {
    padding: 15px 22px;
    background: var(--text);
    color: #faf8f5;
    border: none;
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
  }

  .home-btn-primary:hover {
    background: var(--accent-deep);
    transform: translateY(-1px);
  }

  .home-btn-secondary {
    padding: 15px 22px;
    background: #fffaf3;
    border: 1px solid var(--line);
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
  }

  .home-btn-secondary:hover {
    background: #f6eee2;
    transform: translateY(-1px);
  }

  .home-image-card {
    position: relative;
    overflow: hidden;
    border-radius: 28px;
    min-height: 460px;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    display: flex;
    align-items: flex-end;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }

  .home-image-card::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(32, 23, 17, 0.45),
      rgba(32, 23, 17, 0.08)
    );
  }

  .home-image-caption {
    position: relative;
    z-index: 1;
    margin: 22px;
    background: rgba(255, 248, 240, 0.9);
    border: 1px solid rgba(228, 216, 198, 0.95);
    padding: 10px 16px;
    border-radius: 999px;
    font-size: 0.76rem;
    color: #6a5a49;
    font-weight: 700;
    text-transform: uppercase;
  }

  .home-status-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 22px;
  }

  .home-status-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
  }

  .home-booking-wrap {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .home-section-heading {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    margin: 0;
    color: var(--text);
  }

  @media (max-width: 980px) {
    .home-hero {
      grid-template-columns: 1fr;
    }
  }
`;

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="home-root">
          <div className="home-hero">
            <div className="home-hero-card">
              <span className="home-badge">Art Studio Café</span>

              <h1 className="home-title">
                Warm art workshops, cosy café moments, and creative gatherings.
              </h1>

              <div className="home-divider" />

              <p className="home-subtitle">
                Step into a thoughtfully curated space where art, coffee, and connection come together.
              </p>

              <div className="home-actions">
                {!user ? (
                  <>
                    <button className="home-btn-primary" onClick={() => navigate("/login")}>
                      Login
                    </button>
                    <button className="home-btn-secondary" onClick={() => navigate("/register")}>
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    <button className="home-btn-primary" onClick={() => navigate("/activities")}>
                      Explore Activities
                    </button>
                    <button className="home-btn-secondary" onClick={logout}>
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className="home-image-card"
              style={{
                backgroundImage: `linear-gradient(rgba(36, 28, 23, 0.22), rgba(36, 28, 23, 0.34)), url(${heroImage})`,
              }}
            >
              <div className="home-image-caption">
                Warm Workshops • Café Moments • Creative Gatherings
              </div>
            </div>
          </div>

          <div className="home-status-card">
            <h2 className="home-status-title">
              {user ? `Welcome back, ${user.username}!` : "Welcome to the studio."}
            </h2>
            <p>
              {user
                ? "You’re ready to book your next experience."
                : "Login to start your booking journey."}
            </p>
          </div>

          {user && (
            <div className="home-booking-wrap">
              <h2 className="home-section-heading">Start your booking</h2>
              <BookingPage />
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}