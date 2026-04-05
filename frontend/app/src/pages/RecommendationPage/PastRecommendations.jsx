import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_GATEWAY } from "../../constants";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .past-root {
    font-family: 'DM Sans', sans-serif;
    background: linear-gradient(180deg, #faf8f5 0%, #f5f1ea 100%);
    min-height: 100vh;
    color: #241c17;
  }

  .past-header {
    background: linear-gradient(135deg, #1a1612 0%, #2a2320 100%);
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }
  .past-header::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(201,168,124,0.5), transparent);
  }
  .past-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    color: #faf8f5;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .past-header-brand span { color: #c9a87c; }
  .past-header-back {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: #c9a87c;
    font-size: 0.85rem;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    padding: 8px 18px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.25s;
  }
  .past-header-back:hover {
    background: rgba(255,255,255,0.15);
    color: #faf8f5;
    transform: translateX(-2px);
  }

  .past-content {
    max-width: 780px;
    margin: 0 auto;
    padding: 48px 24px 100px;
  }

  .past-title {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #1a1612;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #1a1612, #4a3f35);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .past-subtitle {
    font-size: 0.95rem;
    color: #7c6f5e;
    margin-bottom: 32px;
    line-height: 1.6;
  }

  /* ── Empty state ── */
  .past-empty {
    text-align: center;
    padding: 80px 24px;
    background: #fff;
    border: 1px solid #e8e2da;
    border-radius: 20px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    animation: fade-in 0.5s ease;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .past-empty-icon {
    font-size: 3rem;
    margin-bottom: 16px;
    color: #c9a87c;
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.95); }
  }
  .past-empty-text {
    font-size: 1rem;
    color: #6b5d52;
    line-height: 1.7;
    max-width: 360px;
    margin: 0 auto;
  }

  /* ── Card ── */
  .past-card {
    background: #fff;
    border: 1px solid #e8e2da;
    border-radius: 16px;
    padding: 22px 26px;
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 14px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    animation: fade-in 0.4s ease;
  }
  .past-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #c9a87c, #b38d5e);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .past-card:hover {
    border-color: #c9a87c;
    box-shadow: 0 6px 24px rgba(201,168,124,0.15);
    transform: translateY(-3px);
  }
  .past-card:hover::before { opacity: 1; }

  .past-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    color: #fff;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 12px rgba(201,168,124,0.3);
  }

  .past-card-info { flex: 1; }
  .past-card-type {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 6px;
  }
  .past-card-meta {
    font-size: 0.82rem;
    color: #8a7d6f;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .past-card-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .past-card-meta-icon {
    font-size: 0.75rem;
    color: #c9a87c;
  }

  .past-card-confidence {
    text-align: right;
    flex-shrink: 0;
    padding: 8px 14px;
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    border-radius: 10px;
    border: 1px solid #e8e2da;
  }
  .past-card-confidence-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: #c9a87c;
  }
  .past-card-confidence-label {
    font-size: 0.65rem;
    color: #8a7d6f;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .past-card-arrow {
    flex-shrink: 0;
    transition: all 0.3s;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(201,168,124,0.1);
    font-size: 0.95rem;
    color: #c9a87c;
    padding-bottom: 2px;
  }
  .past-card:hover .past-card-arrow {
    transform: translateX(4px);
    background: rgba(201,168,124,0.2);
  }

  /* ── Loading ── */
  .past-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 20px;
    animation: fade-in 0.5s ease;
  }
  .past-loader-ring {
    width: 44px;
    height: 44px;
    border: 4px solid #e8e2da;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: past-spin 1s linear infinite;
    position: relative;
  }
  .past-loader-ring::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid rgba(201,168,124,0.15);
    animation: past-spin 1.5s linear infinite reverse;
  }
  @keyframes past-spin { to { transform: rotate(360deg); } }
  .past-loading-text, .past-loading-title {
    font-size: 0.95rem;
    color: #7c6f5e;
    font-weight: 500;
  }
  .past-loading-title {
    font-size: 1.1rem;
    color: #5a4e3f;
    font-weight: 600;
  }
  .past-login-btn {
    margin-top: 16px;
    padding: 10px 28px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #c9a87c, #a8895c);
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .past-login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(201,168,124,0.4);
  }

  /* ── Error ── */
  .past-error {
    text-align: center;
    padding: 80px 24px;
    animation: fade-in 0.5s ease;
  }
  .past-error-text {
    font-size: 0.95rem;
    color: #b04a2e;
    background: linear-gradient(135deg, #fff5f2, #ffe8e2);
    border: 1px solid #f5c5b8;
    border-radius: 12px;
    padding: 16px 24px;
    max-width: 380px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* ── Responsive ── */
  @media (max-width: 760px) {
    .past-content { padding: 32px 16px 80px; }
    .past-card { 
      padding: 18px; 
      flex-wrap: wrap;
    }
    .past-card-confidence {
      order: 3;
      width: 100%;
      text-align: center;
      margin-top: 8px;
    }
    .past-title { font-size: 1.6rem; }
  }
`;

export default function PastRecommendations() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        const userId = user.username;
        console.log("[PastRec] user_id:", userId);

        if (!userId) {
          setResults([]);
          setLoading(false);
          return;
        }

        const url = `${API_GATEWAY}/quiz/user-results?user_id=${encodeURIComponent(userId)}`;
        console.log("[PastRec] fetching:", url);
        const res = await fetch(url);
        console.log("[PastRec] status:", res.status);

        if (!res.ok) {
          const errText = await res.text();
          console.error("[PastRec] error body:", errText);
          throw new Error(`Failed to fetch past results (${res.status})`);
        }
        const data = await res.json();
        console.log("[PastRec] received:", data);
        setResults(data.results || []);
        setLoading(false);
      } catch (err) {
        console.error("[PastRec] error:", err);
        setError(err.message || "Something went wrong");
        setLoading(false);
      }
    };

    fetchResults();
  }, [user]);

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="past-root">
          <div className="past-header">
            <span className="past-header-brand">Café de <span>Paris</span></span>
            <button className="past-header-back" onClick={() => navigate("/")}>← Back</button>
          </div>
          <div className="past-loading">
            <div className="past-loader-ring" />
            <p className="past-loading-text">Loading your past results…</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="past-root">
          <div className="past-header">
            <span className="past-header-brand">Café de <span>Paris</span></span>
            <button className="past-header-back" onClick={() => navigate("/")}>← Back</button>
          </div>
          <div className="past-error">
            <p className="past-error-text">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="past-root">
        <div className="past-header">
          <span className="past-header-brand">Café de <span>Paris</span></span>
          <button className="past-header-back" onClick={() => navigate("/")}>← Back</button>
        </div>

        <div className="past-content">
          <h1 className="past-title">Your Past Recommendations</h1>
          <p className="past-subtitle">
            {results.length
              ? `${results.length} quiz result${results.length > 1 ? "s" : ""} found`
              : "No quiz results yet"}
          </p>

          {!user ? (
            <div className="past-empty">
              <div className="past-empty-icon">✦</div>
              <p className="past-empty-text">
                Please log in to view your past recommendations.
              </p>
              <button className="past-login-btn" onClick={() => navigate("/login")}>
                Go to Login
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="past-empty">
              <div className="past-empty-icon">✦</div>
              <p className="past-empty-text">
                You haven't taken the quiz yet. Open the chat widget to discover your creative personality!
              </p>
            </div>
          ) : (
            results.map((item, index) => (
              <div
                key={item.submission_id}
                className="past-card"
                onClick={() => navigate(`/quiz/result/${item.submission_id}`)}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="past-card-icon">✦</div>
                <div className="past-card-info">
                  <div className="past-card-type">{item.personality_type}</div>
                  <div className="past-card-meta">
                    <span className="past-card-meta-item">
                      <span className="past-card-meta-icon">📅</span>
                      {item.submitted_at
                        ? new Date(item.submitted_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Unknown date"}
                    </span>
                    {item.submitted_at && (
                      <span className="past-card-meta-item">
                        <span className="past-card-meta-icon">🕒</span>
                        {new Date(item.submitted_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="past-card-confidence">
                  <div className="past-card-confidence-value">
                    {item.confidence_score ? `${Math.round(item.confidence_score * 100)}%` : "—"}
                  </div>
                  <div className="past-card-confidence-label">Confidence</div>
                </div>
                <div className="past-card-arrow">→</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
