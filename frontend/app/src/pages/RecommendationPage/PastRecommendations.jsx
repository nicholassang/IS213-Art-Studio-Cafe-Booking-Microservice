import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_GATEWAY, getOrCreateUserId } from "../../constants";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .past-root {
    font-family: 'DM Sans', sans-serif;
    background: #faf8f5;
    min-height: 100vh;
    color: #241c17;
  }

  .past-header {
    background: #1a1612;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .past-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    color: #faf8f5;
    font-weight: 700;
  }
  .past-header-brand span { color: #c9a87c; }
  .past-header-back {
    background: none;
    border: 1px solid rgba(255,255,255,0.15);
    color: #c9a87c;
    font-size: 0.82rem;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    padding: 7px 16px;
    border-radius: 100px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .past-header-back:hover {
    background: rgba(255,255,255,0.08);
    color: #faf8f5;
  }

  .past-content {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  .past-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    font-weight: 700;
    color: #1a1612;
    margin-bottom: 8px;
  }
  .past-subtitle {
    font-size: 0.9rem;
    color: #7c6f5e;
    margin-bottom: 28px;
  }

  /* ── Empty state ── */
  .past-empty {
    text-align: center;
    padding: 60px 20px;
  }
  .past-empty-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
  }
  .past-empty-text {
    font-size: 0.95rem;
    color: #7c6f5e;
    line-height: 1.6;
  }

  /* ── Card ── */
  .past-card {
    background: #fff;
    border: 1px solid #ede8e1;
    border-radius: 14px;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .past-card:hover {
    border-color: #c9a87c;
    box-shadow: 0 4px 16px rgba(201,168,124,0.12);
    transform: translateY(-1px);
  }

  .past-card-rank {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c, #b38d5e);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .past-card-info { flex: 1; }
  .past-card-type {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 4px;
  }
  .past-card-meta {
    font-size: 0.78rem;
    color: #aaa098;
  }

  .past-card-confidence {
    text-align: right;
    flex-shrink: 0;
  }
  .past-card-confidence-value {
    font-size: 1rem;
    font-weight: 600;
    color: #c9a87c;
  }
  .past-card-confidence-label {
    font-size: 0.65rem;
    color: #aaa098;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .past-card-arrow {
    font-size: 1rem;
    color: #c9a87c;
    flex-shrink: 0;
    transition: transform 0.2s;
  }
  .past-card:hover .past-card-arrow {
    transform: translateX(3px);
  }

  /* ── Loading ── */
  .past-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    gap: 16px;
  }
  .past-loader-ring {
    width: 36px;
    height: 36px;
    border: 3px solid #e2dbd2;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: past-spin 0.9s linear infinite;
  }
  @keyframes past-spin { to { transform: rotate(360deg); } }
  .past-loading-text {
    font-size: 0.9rem;
    color: #7c6f5e;
  }

  /* ── Error ── */
  .past-error {
    text-align: center;
    padding: 60px 20px;
  }
  .past-error-text {
    font-size: 0.9rem;
    color: #b04a2e;
    background: #fff3f0;
    border: 1px solid #f5c5b8;
    border-radius: 10px;
    padding: 12px 20px;
    max-width: 360px;
    margin: 0 auto;
  }

  @media (max-width: 760px) {
    .past-content { padding: 24px 16px 60px; }
    .past-card { padding: 16px; }
  }
`;

export default function PastRecommendations() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Use username when logged in, fallback to localStorage guest ID
        const userId = user ? user.username : getOrCreateUserId();
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

          {results.length === 0 ? (
            <div className="past-empty">
              <div className="past-empty-icon">✦</div>
              <p className="past-empty-text">
                {user
                  ? "You haven't taken the quiz yet. Open the chat widget to discover your creative personality!"
                  : "No results found for your account."}
              </p>
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.submission_id}
                className="past-card"
                onClick={() => navigate(`/quiz/result/${item.submission_id}`)}
              >
                <div className="past-card-rank">✦</div>
                <div className="past-card-info">
                  <div className="past-card-type">{item.personality_type}</div>
                  <div className="past-card-meta">
                    {item.submitted_at
                      ? new Date(item.submitted_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Unknown date"}
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
