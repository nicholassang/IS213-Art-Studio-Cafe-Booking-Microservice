import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_GATEWAY } from "../../constants";
import { useAuth } from "../../context/AuthContext";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // 60 seconds max

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .result-root {
    font-family: 'DM Sans', sans-serif;
    background: linear-gradient(180deg, #faf8f5 0%, #f5f1ea 100%);
    min-height: 100vh;
    color: #241c17;
  }

  /* ── Header ── */
  .result-header {
    background: linear-gradient(135deg, #1a1612 0%, #2a2320 100%);
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }
  .result-header::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(201,168,124,0.5), transparent);
  }
  .result-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    color: #faf8f5;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .result-header-brand span { color: #c9a87c; }

  /* ── Loading ── */
  .result-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
    gap: 24px;
    padding: 40px;
    text-align: center;
    animation: fade-in 0.5s ease;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .result-loader-ring {
    width: 56px;
    height: 56px;
    border: 4px solid #e8e2da;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    position: relative;
  }
  .result-loader-ring::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 2px solid rgba(201,168,124,0.2);
    animation: spin 1.5s linear infinite reverse;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .result-loading-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    color: #1a1612;
    font-weight: 600;
  }
  .result-loading-sub {
    font-size: 0.9rem;
    color: #7c6f5e;
    max-width: 320px;
    line-height: 1.7;
  }

  /* ── Error ── */
  .result-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 20px;
    padding: 40px;
    text-align: center;
    animation: fade-in 0.5s ease;
  }
  .result-error-text {
    font-size: 0.95rem;
    color: #b04a2e;
    background: linear-gradient(135deg, #fff5f2, #ffe8e2);
    border: 1px solid #f5c5b8;
    border-radius: 12px;
    padding: 16px 24px;
    max-width: 380px;
    line-height: 1.6;
  }

  /* ── Content ── */
  .result-content {
    max-width: 960px;
    margin: 0 auto;
    padding: 48px 24px 100px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    animation: fade-in 0.6s ease;
  }

  /* ── Section card ── */
  .result-section {
    background: #fff;
    border: 1px solid #e8e2da;
    border-radius: 20px;
    padding: 32px 36px;
    animation: fade-in 0.5s ease;
    box-shadow: 0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02);
    position: relative;
    overflow: hidden;
  }
  .result-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #c9a87c, #e8c99a, #c9a87c);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .result-section:hover::before { opacity: 1; }

  /* ── AI chip ── */
  .result-ai-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #f5f0e8, #ede8e0);
    border: 1px solid #e2dbd2;
    padding: 7px 16px;
    border-radius: 100px;
    font-size: 0.75rem;
    color: #6b5d52;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin-bottom: 20px;
  }
  .result-ai-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c9a87c;
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 6px rgba(201,168,124,0.5);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  /* ── Personality profile header ── */
  .result-type-badge {
    display: inline-block;
    background: linear-gradient(135deg, #1a1612, #2a2320);
    color: #c9a87c;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 100px;
    margin-bottom: 14px;
    box-shadow: 0 2px 8px rgba(26,22,18,0.2);
  }
  .result-profile-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.25;
    color: #1a1612;
    margin-bottom: 18px;
    background: linear-gradient(135deg, #1a1612, #4a3f35);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .result-profile-body {
    font-size: 1rem;
    line-height: 1.8;
    color: #4a3f35;
  }

  /* ── Confidence meter ── */
  .result-confidence {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #f0ebe3;
  }
  .result-confidence-label {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #8a7d6f;
    font-weight: 600;
    min-width: 120px;
  }
  .result-confidence-track {
    flex: 1;
    max-width: 200px;
    height: 8px;
    background: #e8e2da;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }
  .result-confidence-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #e8c99a);
    border-radius: 4px;
    transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  .result-confidence-fill::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #c9a87c;
    box-shadow: 0 2px 6px rgba(201,168,124,0.4);
  }
  .result-confidence-fill.low {
    background: linear-gradient(90deg, #d45a4a, #e88a7a);
  }
  .result-confidence-fill.low::after {
    border-color: #d45a4a;
  }
  .result-confidence-pct {
    font-size: 0.9rem;
    color: #c9a87c;
    font-weight: 700;
    min-width: 45px;
    text-align: right;
  }
  .result-confidence-pct.low {
    color: #d45a4a;
  }

  /* ── Low-confidence notice ── */
  .result-low-confidence-notice {
    margin-top: 24px;
    padding: 18px 20px;
    background: linear-gradient(135deg, #fff8f5, #fff0eb);
    border: 1px solid #f5d5c8;
    border-radius: 12px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .result-low-confidence-icon {
    font-size: 1.2rem;
    color: #d45a4a;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .result-low-confidence-text {
    font-size: 0.88rem;
    line-height: 1.7;
    color: #6b5d52;
  }

  /* ── Scores breakdown ── */
  .result-scores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #f0ebe3;
  }
  .result-score-item {
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    padding: 18px 20px;
    border-radius: 14px;
    border: 1px solid #e8e2da;
  }
  .result-score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .result-score-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #4a3f35;
  }
  .result-score-value {
    font-size: 0.95rem;
    font-weight: 700;
    color: #c9a87c;
    background: rgba(201,168,124,0.15);
    padding: 3px 10px;
    border-radius: 8px;
  }
  .result-score-bar-track {
    width: 100%;
    height: 8px;
    background: #e8e2da;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }
  .result-score-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #b38d5e);
    border-radius: 4px;
    transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
    position: relative;
  }
  .result-score-bar-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: score-shimmer 2s ease-in-out infinite;
  }
  @keyframes score-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .result-score-reasoning {
    margin-top: 20px;
    padding: 18px 20px;
    background: linear-gradient(135deg, #f8f5f0, #f0ebe3);
    border-left: 3px solid #c9a87c;
    border-radius: 0 10px 10px 0;
    font-size: 0.9rem;
    line-height: 1.7;
    color: #6b5d52;
    font-style: italic;
  }

  /* ── Divider ── */
  .result-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #e2dbd2, transparent);
  }

  /* ── Section headings ── */
  .result-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .result-section-title::before {
    content: '✦';
    color: #c9a87c;
    font-size: 0.9rem;
  }

  /* ── Activity cards ── */
  .result-activity-card {
    display: flex;
    gap: 18px;
    padding: 20px 22px;
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    border: 1px solid #e8e2da;
    border-radius: 14px;
    margin-bottom: 14px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .result-activity-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #c9a87c, #b38d5e);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .result-activity-card:hover {
    border-color: #c9a87c;
    box-shadow: 0 6px 20px rgba(201,168,124,0.15);
    transform: translateX(4px);
  }
  .result-activity-card:hover::before { opacity: 1; }
  .result-activity-card:last-child { margin-bottom: 0; }
  .result-activity-rank {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    color: #fff;
    font-size: 0.9rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(201,168,124,0.3);
  }
  .result-activity-info { flex: 1; }
  .result-activity-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 8px;
  }
  .result-activity-explanation {
    font-size: 0.9rem;
    line-height: 1.7;
    color: #6b5d52;
  }

  /* ── Food & Drink grid ── */
  .result-food-drink-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .result-food-drink-card {
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    border: 1px solid #e8e2da;
    border-radius: 14px;
    padding: 22px;
    transition: all 0.3s;
  }
  .result-food-drink-card:hover {
    border-color: #c9a87c;
    box-shadow: 0 4px 16px rgba(201,168,124,0.12);
    transform: translateY(-2px);
  }
  .result-food-drink-card-title {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #8a7d6f;
    font-weight: 600;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .result-food-drink-card-title::before {
    content: '✦';
    color: #c9a87c;
    font-size: 0.6rem;
  }
  .result-food-drink-item {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e8e2da;
  }
  .result-food-drink-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  .result-food-drink-rank {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 600;
    color: #c9a87c;
    background: rgba(201,168,124,0.15);
    padding: 3px 10px;
    border-radius: 100px;
    margin-bottom: 8px;
  }
  .result-food-drink-name {
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 6px;
  }
  .result-food-drink-explanation {
    font-size: 0.85rem;
    line-height: 1.65;
    color: #6b5d52;
  }

  /* ── Closing ── */
  .result-closing {
    background: linear-gradient(135deg, #1a1612, #2a2320);
    border-radius: 16px;
    padding: 28px 32px;
    color: #faf8f5;
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    line-height: 1.75;
    font-style: italic;
    position: relative;
    overflow: hidden;
  }
  .result-closing::before {
    content: '"';
    position: absolute;
    top: -10px;
    left: 20px;
    font-size: 6rem;
    color: rgba(201,168,124,0.15);
    font-family: Georgia, serif;
    line-height: 1;
  }

  /* ── Action buttons ── */
  .result-actions {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .result-retake-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 32px;
    background: transparent;
    border: 2px solid #c9a87c;
    color: #c9a87c;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .result-retake-btn::before {
    content: '↻';
    font-size: 1.1rem;
    transition: transform 0.3s;
  }
  .result-retake-btn:hover {
    background: #c9a87c;
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(201,168,124,0.3);
  }
  .result-retake-btn:hover::before {
    transform: rotate(180deg);
  }
  .result-view-past-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 32px;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    border: none;
    color: #fff;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 14px rgba(201,168,124,0.3);
  }
  .result-view-past-btn::before {
    content: '📋';
    font-size: 1rem;
  }
  .result-view-past-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201,168,124,0.4);
  }

  /* ── Responsive ── */
  @media (max-width: 760px) {
    .result-content { padding: 32px 16px 80px; gap: 28px; }
    .result-section { padding: 24px 20px; }
    .result-profile-title { font-size: 1.7rem; }
    .result-scores { grid-template-columns: 1fr; gap: 16px; }
    .result-food-drink-grid { grid-template-columns: 1fr; }
    .result-activity-card { flex-direction: column; gap: 14px; }
    .result-confidence { flex-wrap: wrap; }
    .result-actions { flex-direction: column; }
    .result-retake-btn, .result-view-past-btn { width: 100%; justify-content: center; }
  }
`;

export default function ResultPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
        const confidence = rec.confidence_score ?? 0.6;
        const solo = rec.scores?.solo_social ?? 5;
        const structured = rec.scores?.structured_freeform ?? 5;
        setTimeout(() => {
          setConfWidth(Math.round(confidence * 100));
          setSoloWidth((solo / 10) * 100);
          setStructuredWidth((structured / 10) * 100);
        }, 200);
        return;
      }

      // sessionStorage has no data — this means either:
      // 1. User refreshed/navigated away and lost the cache
      // 2. This was an unauthenticated session (results not stored in Supabase)
      // Since unauthenticated results are never stored server-side, stop polling immediately.
      try {
        const res = await fetch(`${API_GATEWAY}/quiz/submissions/${submissionId}`);

        // Result not found — unauthenticated users never have server-side results
        if (res.status === 404) {
          clearInterval(intervalId);
          setError("This result is no longer available. Unauthenticated quiz results aren't saved — try retaking the quiz to get a fresh recommendation!");
          setLoading(false);
          return;
        }

        // Still processing — AI recommendation not ready yet
        if (res.status === 202) {
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
        const confidence = rec.confidence_score ?? 0.6;
        const solo = rec.scores?.solo_social ?? 5;
        const structured = rec.scores?.structured_freeform ?? 5;
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

            {/* ── Actions ── */}
            <div className="result-actions">
              <button className="result-retake-btn" onClick={handleRetake}>
                Retake the Quiz
              </button>
              {user && (
                <button className="result-view-past-btn" onClick={() => navigate("/my-recommendations")}>
                  View Past Recommendations
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
