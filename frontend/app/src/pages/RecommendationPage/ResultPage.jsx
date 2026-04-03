import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_GATEWAY } from "../../constants";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // 60 seconds max

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

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
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    display: flex;
    flex-direction: column;
    gap: 36px;
    animation: fade-in 0.5s ease;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Section card ── */
  .result-section {
    background: #fff;
    border: 1px solid #ede8e1;
    border-radius: 16px;
    padding: 28px 32px;
    animation: fade-in 0.5s ease;
  }

  /* ── AI chip ── */
  .result-ai-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: #f0ebe3;
    border: 1px solid #e2dbd2;
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 0.72rem;
    color: #7c6f5e;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin-bottom: 18px;
  }
  .result-ai-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c9a87c;
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* ── Personality profile header ── */
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
    margin-bottom: 12px;
  }
  .result-profile-title {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.25;
    color: #1a1612;
    margin-bottom: 16px;
  }
  .result-profile-body {
    font-size: 0.95rem;
    line-height: 1.75;
    color: #4a3f35;
  }

  /* ── Confidence meter ── */
  .result-confidence {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f0ebe3;
  }
  .result-confidence-label {
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #aaa098;
    font-weight: 500;
  }
  .result-confidence-track {
    flex: 1;
    max-width: 180px;
    height: 5px;
    background: #e2dbd2;
    border-radius: 3px;
    overflow: hidden;
  }
  .result-confidence-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #e8c99a);
    border-radius: 3px;
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .result-confidence-pct {
    font-size: 0.82rem;
    color: #c9a87c;
    font-weight: 600;
  }
  .result-confidence-pct.low {
    color: #d45a4a;
  }
  .result-confidence-fill.low {
    background: linear-gradient(90deg, #d45a4a, #e88a7a);
  }

  /* ── Low-confidence notice ── */
  .result-low-confidence-notice {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f0ebe3;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .result-low-confidence-icon {
    font-size: 1rem;
    color: #d45a4a;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .result-low-confidence-text {
    font-size: 0.85rem;
    line-height: 1.65;
    color: #6b5d52;
  }

  /* ── Scores breakdown ── */
  .result-scores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f0ebe3;
  }
  .result-score-item {}
  .result-score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .result-score-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: #4a3f35;
  }
  .result-score-value {
    font-size: 0.82rem;
    font-weight: 600;
    color: #c9a87c;
  }
  .result-score-bar-track {
    width: 100%;
    height: 6px;
    background: #e2dbd2;
    border-radius: 3px;
    overflow: hidden;
  }
  .result-score-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #b38d5e);
    border-radius: 3px;
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
  }
  .result-score-reasoning {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0ebe3;
    font-size: 0.85rem;
    line-height: 1.65;
    color: #6b5d52;
    font-style: italic;
  }

  /* ── Divider ── */
  .result-divider {
    height: 1px;
    background: #e2dbd2;
  }

  /* ── Section headings ── */
  .result-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 20px;
  }

  /* ── Activity cards ── */
  .result-activity-card {
    display: flex;
    gap: 16px;
    padding: 18px 20px;
    background: #faf8f5;
    border: 1px solid #ede8e1;
    border-radius: 12px;
    margin-bottom: 12px;
  }
  .result-activity-card:last-child { margin-bottom: 0; }
  .result-activity-rank {
    width: 36px;
    height: 36px;
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
  .result-activity-info { flex: 1; }
  .result-activity-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 6px;
  }
  .result-activity-explanation {
    font-size: 0.88rem;
    line-height: 1.65;
    color: #6b5d52;
  }

  /* ── Food & Drink grid ── */
  .result-food-drink-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .result-food-drink-card {
    background: #faf8f5;
    border: 1px solid #ede8e1;
    border-radius: 12px;
    padding: 20px;
  }
  .result-food-drink-card-title {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #aaa098;
    font-weight: 500;
    margin-bottom: 12px;
  }
  .result-food-drink-item {
    margin-bottom: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2dbd2;
  }
  .result-food-drink-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  .result-food-drink-rank {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 600;
    color: #c9a87c;
    background: #f0ebe3;
    padding: 2px 8px;
    border-radius: 100px;
    margin-bottom: 6px;
  }
  .result-food-drink-name {
    font-family: 'Playfair Display', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 4px;
  }
  .result-food-drink-explanation {
    font-size: 0.82rem;
    line-height: 1.6;
    color: #6b5d52;
  }

  /* ── Closing ── */
  .result-closing {
    background: #1a1612;
    border-radius: 12px;
    padding: 24px 28px;
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
    align-self: center;
  }
  .result-retake-btn:hover {
    background: #c9a87c;
    color: #fff;
  }

  /* ── Responsive ── */
  @media (max-width: 760px) {
    .result-content { padding: 24px 16px 60px; gap: 24px; }
    .result-section { padding: 20px; }
    .result-profile-title { font-size: 1.6rem; }
    .result-scores { grid-template-columns: 1fr; }
    .result-food-drink-grid { grid-template-columns: 1fr; }
    .result-activity-card { flex-direction: column; gap: 12px; }
  }
`;

export default function ResultPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confWidth, setConfWidth] = useState(0);
  const [soloWidth, setSoloWidth] = useState(0);
  const [structuredWidth, setStructuredWidth] = useState(0);

  useEffect(() => {
    let polls = 0;
    let intervalId;

    const fetchResult = async () => {
      // Check sessionStorage first — unauthenticated users won't have data in Supabase
      const cached = sessionStorage.getItem(`quiz_result_${submissionId}`);
      if (cached) {
        const rec = JSON.parse(cached);
        setResult(rec);
        setLoading(false);
        const confidence = rec.confidence_score || 0.6;
        const solo = rec.scores?.solo_social || 5;
        const structured = rec.scores?.structured_freeform || 5;
        setTimeout(() => {
          setConfWidth(Math.round(confidence * 100));
          setSoloWidth((solo / 10) * 100);
          setStructuredWidth((structured / 10) * 100);
        }, 200);
        return;
      }

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

        // Check if AI recommendation is ready
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
        const rec = data.recommendation;
        setResult(rec);
        setLoading(false);

        // Cache for page-refresh resilience
        sessionStorage.setItem(`quiz_result_${submissionId}`, JSON.stringify(rec));

        // Animate bars after render
        const confidence = rec.confidence_score || 0.6;
        const solo = rec.scores?.solo_social || 5;
        const structured = rec.scores?.structured_freeform || 5;
        setTimeout(() => {
          setConfWidth(Math.round(confidence * 100));
          setSoloWidth((solo / 10) * 100);
          setStructuredWidth((structured / 10) * 100);
        }, 200);
      } catch (err) {
        clearInterval(intervalId);
        setError(err.message || "Something went wrong loading your results.");
        setLoading(false);
      }
    };

    fetchResult();
    intervalId = setInterval(fetchResult, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [submissionId]);

  const handleRetake = () => {
    localStorage.removeItem("quiz_user_id");
    window.dispatchEvent(new CustomEvent("retake-quiz"));
    navigate("/");
  };

  const isLowConfidence = result && (result.confidence_score || 0) < 0.5;

  return (
    <>
      <style>{styles}</style>
      <div className="result-root">
        <div className="result-header">
          <span className="result-header-brand">Café de <span>Paris</span></span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="result-loading">
            <div className="result-loader-ring" />
            <p className="result-loading-title">Crafting your profile…</p>
            <p className="result-loading-sub">
              Our AI is analysing your answers and finding the perfect activities, food, and drinks for you.
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

            {/* ── Personality Profile ── */}
            <div className="result-section">
              <div className="result-ai-chip">
                <span className="result-ai-dot" />
                Your AI-Generated Personality Profile
              </div>

              <div className="result-type-badge">{result.personality_type}</div>
              <h1 className="result-profile-title">{result.profile_title}</h1>
              <p className="result-profile-body">{result.profile_body}</p>

              {/* Confidence meter */}
              {result.confidence_score !== undefined && result.confidence_score !== null && (
                <div className="result-confidence">
                  <span className="result-confidence-label">Match confidence</span>
                  <div className="result-confidence-track">
                    <div
                      className={`result-confidence-fill${isLowConfidence ? " low" : ""}`}
                      style={{ width: `${confWidth}%` }}
                    />
                  </div>
                  <span className={`result-confidence-pct${isLowConfidence ? " low" : ""}`}>
                    {confWidth}%
                  </span>
                </div>
              )}

              {/* Scoring breakdown */}
              {result.scores && (
                <div className="result-scores">
                  <div className="result-score-item">
                    <div className="result-score-header">
                      <span className="result-score-label">Solo ← → Social</span>
                      <span className="result-score-value">{result.scores.solo_social}/10</span>
                    </div>
                    <div className="result-score-bar-track">
                      <div className="result-score-bar-fill" style={{ width: `${soloWidth}%` }} />
                    </div>
                  </div>
                  <div className="result-score-item">
                    <div className="result-score-header">
                      <span className="result-score-label">Structured ← → Freeform</span>
                      <span className="result-score-value">{result.scores.structured_freeform}/10</span>
                    </div>
                    <div className="result-score-bar-track">
                      <div className="result-score-bar-fill" style={{ width: `${structuredWidth}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {result.scores?.reasoning && (
                <p className="result-score-reasoning">"{result.scores.reasoning}"</p>
              )}

              {/* Low-confidence notice */}
              {isLowConfidence && (
                <div className="result-low-confidence-notice">
                  <span className="result-low-confidence-icon">✦</span>
                  <p className="result-low-confidence-text">
                    Your answers were too brief for us to place you into a creative profile or confidently recommend activities, food, or drinks.
                    Try retaking the quiz with a bit more detail — even a sentence or two per answer helps a lot.
                  </p>
                </div>
              )}
            </div>

            {/* ── Activity Recommendations ── */}
            {!isLowConfidence && result.activity_explanations && result.activity_explanations.length > 0 && (
              <div className="result-section">
                <h2 className="result-section-title">Your Recommended Activities</h2>
                {result.activity_explanations
                  .sort((a, b) => a.rank - b.rank)
                  .map((item) => (
                    <div key={item.rank} className="result-activity-card">
                      <div className="result-activity-rank">#{item.rank}</div>
                      <div className="result-activity-info">
                        <div className="result-activity-name">{item.activity}</div>
                        <div className="result-activity-explanation">{item.explanation}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ── Food & Drink Recommendations ── */}
            {!isLowConfidence && (result.food_recommendation_details?.length > 0 || result.drink_recommendation_details) && (
              <div className="result-section">
                <h2 className="result-section-title">Your Food & Drink Picks</h2>
                <div className="result-food-drink-grid">
                  {result.food_recommendation_details && result.food_recommendation_details.length > 0 && (
                    <div className="result-food-drink-card">
                      <div className="result-food-drink-card-title">✦ Food Recommendations</div>
                      {result.food_recommendation_details
                        .sort((a, b) => a.rank - b.rank)
                        .map((item) => (
                          <div key={item.rank} className="result-food-drink-item">
                            <span className="result-food-drink-rank">#{item.rank} Pick</span>
                            <div className="result-food-drink-name">{item.food}</div>
                            <div className="result-food-drink-explanation">{item.explanation}</div>
                          </div>
                        ))}
                    </div>
                  )}

                  {result.drink_recommendation_details && (
                    <div className="result-food-drink-card">
                      <div className="result-food-drink-card-title">✦ Drink Recommendation</div>
                      <div className="result-food-drink-item">
                        <span className="result-food-drink-rank">Perfect Pairing</span>
                        <div className="result-food-drink-name">
                          {result.drink_recommendation_details.drink || result.drink_recommendation}
                        </div>
                        <div className="result-food-drink-explanation">
                          {result.drink_recommendation_details.explanation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Closing ── */}
            {result.closing && (
              <div className="result-closing">{result.closing}</div>
            )}

            {/* ── Retake ── */}
            <button className="result-retake-btn" onClick={handleRetake}>
              Retake the Quiz
            </button>
          </div>
        )}
      </div>
    </>
  );
}
