import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_GATEWAY } from "../../constants";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // 60 seconds max

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .result-root {
    font-family: 'DM Sans', sans-serif;
    background: #faf8f5;
    min-height: 100vh;
    color: #241c17;
  }

  /* ── Header ── */
  .result-header {
    background: #1a1612;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .result-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    color: #faf8f5;
    font-weight: 700;
  }
  .result-header-brand span { color: #c9a87c; }

  /* ── Loading ── */
  .result-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 20px;
    padding: 40px;
    text-align: center;
  }
  .result-loader-ring {
    width: 48px;
    height: 48px;
    border: 3px solid #e2dbd2;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .result-loading-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    color: #1a1612;
  }
  .result-loading-sub {
    font-size: 0.85rem;
    color: #aaa098;
    max-width: 280px;
    line-height: 1.6;
  }

  /* ── Error ── */
  .result-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    padding: 40px;
    text-align: center;
  }
  .result-error-text {
    font-size: 0.9rem;
    color: #b04a2e;
    background: #fff3f0;
    border: 1px solid #f5c5b8;
    border-radius: 10px;
    padding: 12px 20px;
    max-width: 360px;
  }

  /* ── Content ── */
  .result-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    animation: fade-in 0.5s ease;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Type badge ── */
  .result-type-badge {
    display: inline-block;
    background: #1a1612;
    color: #c9a87c;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 100px;
  }

  /* ── Profile title ── */
  .result-profile-title {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.25;
    color: #1a1612;
  }

  /* ── Profile body ── */
  .result-profile-body {
    font-size: 0.95rem;
    line-height: 1.75;
    color: #4a3f35;
  }

  /* ── Divider ── */
  .result-divider {
    height: 1px;
    background: #e2dbd2;
  }

  /* ── Activities section ── */
  .result-activities-heading {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 16px;
  }

  .result-activity-card {
    background: #fff;
    border: 1px solid #ede8e1;
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .result-activity-card + .result-activity-card { margin-top: 12px; }

  .result-activity-rank {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c, #b38d5e);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .result-activity-info { flex: 1; }
  .result-activity-name {
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 6px;
  }
  .result-activity-explanation {
    font-size: 0.88rem;
    line-height: 1.65;
    color: #6b5d52;
  }

  /* ── Closing ── */
  .result-closing {
    background: #1a1612;
    border-radius: 12px;
    padding: 24px;
    color: #faf8f5;
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    line-height: 1.7;
    font-style: italic;
  }

  /* ── Retake button ── */
  .result-retake-btn {
    display: inline-block;
    padding: 12px 28px;
    background: transparent;
    border: 1.5px solid #c9a87c;
    color: #c9a87c;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: background 0.2s, color 0.2s;
    align-self: flex-start;
  }
  .result-retake-btn:hover {
    background: #c9a87c;
    color: #fff;
  }
`;

export default function ResultPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let polls = 0;
    let intervalId;

    const fetchResult = async () => {
      try {
        const res = await fetch(`${API_GATEWAY}/quiz/submissions/${submissionId}`);

        // Still processing — AI recommendation not ready yet
        if (res.status === 404 || res.status === 202) {
          polls++;
          if (polls >= MAX_POLLS) {
            clearInterval(intervalId);
            setError("Your profile is taking longer than expected. Please check back shortly.");
            setLoading(false);
          }
          return;
        }

        if (!res.ok) throw new Error(`Failed to fetch results (${res.status})`);

        const data = await res.json();

        // Check if AI recommendation is ready (composite service returns submission without recommendation if AI isn't done)
        if (!data.recommendation) {
          polls++;
          if (polls >= MAX_POLLS) {
            clearInterval(intervalId);
            setError("Your profile is taking longer than expected. Please check back shortly.");
            setLoading(false);
          }
          return;
        }

        clearInterval(intervalId);
        setResult(data.recommendation);
        setLoading(false);
      } catch (err) {
        clearInterval(intervalId);
        setError(err.message || "Something went wrong loading your results.");
        setLoading(false);
      }
    };

    // Poll until results are ready
    fetchResult();
    intervalId = setInterval(fetchResult, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [submissionId]);

  const handleRetake = () => {
    localStorage.removeItem("quiz_user_id");
    navigate("/");
  };

  return (
    <>
      <style>{styles}</style>
      <div className="result-root">
        <div className="result-header">
          <span className="result-header-brand">Café de <span>Paris</span></span>
        </div>

        {/* Loading state — poll while AI processes */}
        {loading && (
          <div className="result-loading">
            <div className="result-loader-ring" />
            <p className="result-loading-title">Crafting your profile…</p>
            <p className="result-loading-sub">
              Our AI is analysing your answers and finding the perfect activities for you.
              This usually takes about 15–30 seconds.
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="result-error">
            <p className="result-error-text">{error}</p>
            <button className="result-retake-btn" onClick={handleRetake}>
              Try Again
            </button>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="result-content">
            <div>
              <div className="result-type-badge">{result.personality_type}</div>
            </div>

            <h1 className="result-profile-title">{result.profile_title}</h1>

            <p className="result-profile-body">{result.profile_body}</p>

            <div className="result-divider" />

            <div>
              <h2 className="result-activities-heading">Your recommended activities</h2>
              {result.activity_explanations
                ?.sort((a, b) => a.rank - b.rank)
                .map((item) => (
                  <div key={item.rank} className="result-activity-card">
                    <div className="result-activity-rank">{item.rank}</div>
                    <div className="result-activity-info">
                      <div className="result-activity-name">{item.activity}</div>
                      <div className="result-activity-explanation">{item.explanation}</div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="result-closing">{result.closing}</div>

            <button className="result-retake-btn" onClick={handleRetake}>
              Retake the Quiz
            </button>
          </div>
        )}
      </div>
    </>
  );
}
