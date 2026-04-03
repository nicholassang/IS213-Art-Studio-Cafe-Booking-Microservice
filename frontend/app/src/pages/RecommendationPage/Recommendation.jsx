import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_GATEWAY = "http://localhost:8000";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .rec-root {
    font-family: 'DM Sans', sans-serif;
    background: #faf8f5;
    min-height: 100vh;
  }

  /* ── Hero ── */
  .rec-hero {
    background: #1a1612;
    padding: 52px 48px 80px;
    position: relative;
    overflow: hidden;
  }
  .rec-hero::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 380px; height: 380px;
    background: radial-gradient(circle, rgba(201,168,124,0.18) 0%, transparent 70%);
    pointer-events: none;
  }
  .rec-hero::after {
    content: '';
    position: absolute;
    bottom: -60px; left: 10%;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(201,168,124,0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .rec-hero-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    font-weight: 500;
    color: #aaa098;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    padding: 7px 16px;
    border-radius: 100px;
    cursor: pointer;
    margin-bottom: 44px;
    transition: background 0.2s, color 0.2s;
    letter-spacing: 0.02em;
    font-family: 'DM Sans', sans-serif;
  }
  .rec-hero-back:hover {
    background: rgba(255,255,255,0.12);
    color: #fff;
  }

  .rec-hero-eyebrow {
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #c9a87c;
    font-weight: 500;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rec-hero-eyebrow::before {
    content: '';
    display: inline-block;
    width: 28px;
    height: 1px;
    background: #c9a87c;
  }

  .rec-hero-title {
    font-family: 'Playfair Display', serif;
    font-size: 3.4rem;
    line-height: 1.1;
    color: #faf8f5;
    font-weight: 700;
    max-width: 560px;
    margin-bottom: 16px;
  }
  .rec-hero-title em {
    color: #c9a87c;
    font-style: italic;
  }

  .rec-hero-sub {
    font-size: 0.95rem;
    color: #7c6f5e;
    font-weight: 300;
    max-width: 440px;
    line-height: 1.6;
  }

  /* ── Confidence badge ── */
  .rec-confidence-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 32px;
  }
  .rec-confidence-label {
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7c6f5e;
  }
  .rec-confidence-bar-track {
    flex: 1;
    max-width: 160px;
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .rec-confidence-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #e8c99a);
    border-radius: 2px;
    transition: width 1s cubic-bezier(0.4,0,0.2,1) 0.4s;
  }
  .rec-confidence-pct {
    font-size: 0.78rem;
    color: #c9a87c;
    font-weight: 500;
  }

  /* ── Main layout ── */
  .rec-body {
    max-width: 1020px;
    margin: -36px auto 0;
    padding: 0 48px 64px;
    position: relative;
    z-index: 10;
  }

  /* ── Recommendation card ── */
  .rec-card {
    background: #fff;
    border: 1px solid #ede8e1;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 16px 48px rgba(26,22,18,0.1);
    margin-bottom: 28px;
    animation: rec-rise 0.5s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes rec-rise {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .rec-card-inner {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
  }

  .rec-card-img-wrap {
    position: relative;
    overflow: hidden;
  }
  .rec-card-img {
    width: 100%;
    height: 360px;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
  }
  .rec-card:hover .rec-card-img {
    transform: scale(1.04);
  }
  .rec-card-img-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, transparent 60%, rgba(255,255,255,0.15));
    pointer-events: none;
  }
  .rec-card-img-badge {
    position: absolute;
    top: 18px; left: 18px;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(6px);
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #c9a87c;
  }

  .rec-card-content {
    padding: 36px 36px 36px 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .rec-card-badge {
    display: inline-block;
    background: #f0ebe3;
    color: #7c6f5e;
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 14px;
    align-self: flex-start;
  }

  .rec-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.9rem;
    line-height: 1.22;
    color: #1a1612;
    font-weight: 700;
    margin-bottom: 12px;
  }

  .rec-card-divider {
    width: 40px;
    height: 3px;
    background: #c9a87c;
    border-radius: 2px;
    margin-bottom: 16px;
  }

  .rec-card-reason-label {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #aaa098;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .rec-card-reason {
    font-size: 0.93rem;
    color: #6b6357;
    line-height: 1.7;
    font-weight: 300;
    flex: 1;
  }

  .rec-card-meta {
    display: flex;
    gap: 20px;
    margin: 20px 0 24px;
    padding-top: 20px;
    border-top: 1px solid #f0ebe3;
  }
  .rec-meta-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .rec-meta-label {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #aaa098;
    font-weight: 500;
  }
  .rec-meta-value {
    font-size: 0.88rem;
    color: #1a1612;
    font-weight: 500;
  }

  .rec-price-row {
    display: flex;
    align-items: baseline;
    gap: 3px;
    margin-bottom: 20px;
  }
  .rec-price-currency {
    font-size: 1rem;
    color: #c9a87c;
    font-weight: 500;
  }
  .rec-price-amount {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    color: #1a1612;
    line-height: 1;
    font-weight: 700;
  }
  .rec-price-note {
    font-size: 0.78rem;
    color: #aaa098;
    margin-left: 4px;
  }

  .rec-cta {
    width: 100%;
    padding: 14px 24px;
    background: #1a1612;
    color: #faf8f5;
    border: none;
    border-radius: 12px;
    font-size: 0.93rem;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.04em;
    transition: background 0.2s, transform 0.15s;
  }
  .rec-cta:hover {
    background: #c9a87c;
    transform: translateY(-1px);
  }

  /* ── AI chip ── */
  .rec-ai-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: #f0ebe3;
    border: 1px solid #e2dbd2;
    padding: 7px 16px;
    border-radius: 100px;
    font-size: 0.76rem;
    color: #7c6f5e;
    font-weight: 500;
    letter-spacing: 0.03em;
    margin-bottom: 24px;
    align-self: flex-start;
  }
  .rec-ai-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c9a87c;
    animation: rec-pulse 1.8s ease-in-out infinite;
  }
  @keyframes rec-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* ── Secondary suggestions ── */
  .rec-also-label {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #aaa098;
    font-weight: 500;
    margin-bottom: 16px;
  }
  .rec-also-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 36px;
  }
  .rec-also-card {
    background: #fff;
    border: 1px solid #ede8e1;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .rec-also-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(26,22,18,0.09);
  }
  .rec-also-img {
    width: 100%;
    height: 130px;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }
  .rec-also-card:hover .rec-also-img {
    transform: scale(1.05);
  }
  .rec-also-body {
    padding: 14px 16px 16px;
  }
  .rec-also-name {
    font-family: 'Playfair Display', serif;
    font-size: 0.98rem;
    color: #1a1612;
    font-weight: 700;
    margin-bottom: 4px;
    line-height: 1.3;
  }
  .rec-also-meta {
    font-size: 0.78rem;
    color: #aaa098;
  }
  .rec-also-price {
    font-size: 0.88rem;
    color: #c9a87c;
    font-weight: 600;
    margin-top: 8px;
  }

  /* ── Retake link ── */
  .rec-retake {
    text-align: center;
    margin-top: 8px;
  }
  .rec-retake-btn {
    background: none;
    border: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    color: #aaa098;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color 0.2s;
  }
  .rec-retake-btn:hover { color: #7c6f5e; }

  /* ── Loading ── */
  .rec-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #faf8f5;
    gap: 20px;
  }
  .rec-loader-ring {
    width: 52px;
    height: 52px;
    border: 3px solid #e2dbd2;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: rec-spin 0.9s linear infinite;
  }
  @keyframes rec-spin { to { transform: rotate(360deg); } }
  .rec-loading-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    color: #1a1612;
  }
  .rec-loading-sub {
    font-size: 0.83rem;
    color: #aaa098;
    margin-top: -12px;
  }

  /* ── Error ── */
  .rec-error-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    background: #faf8f5;
    text-align: center;
    padding: 24px;
  }
  .rec-error-icon { font-size: 2.5rem; }
  .rec-error-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    color: #1a1612;
  }
  .rec-error-text { font-size: 0.88rem; color: #aaa098; }

  @media (max-width: 760px) {
    .rec-hero { padding: 32px 24px 60px; }
    .rec-hero-title { font-size: 2.2rem; }
    .rec-body { padding: 0 20px 48px; }
    .rec-card-inner { grid-template-columns: 1fr; }
    .rec-card-img { height: 240px; }
    .rec-also-grid { grid-template-columns: 1fr 1fr; }
  }
`;

export default function RecommendationPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [recommended, setRecommended] = useState(null);
  const [otherActivities, setOtherActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confWidth, setConfWidth] = useState(0);

  const normalizeConfidence = (value, fallback = 0.5) => {
    const parsed = Number(value);
    const normalized = Number.isFinite(parsed) ? (parsed > 1 ? parsed / 100 : parsed) : fallback;
    return Math.max(0, Math.min(1, normalized));
  };

  const normalizeRankedActivities = (recommendation) => {
    if (Array.isArray(recommendation?.activities) && recommendation.activities.length > 0) {
      return recommendation.activities
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 3);
    }
    if (recommendation?.activity) {
      return [String(recommendation.activity).trim()].filter(Boolean);
    }
    return [];
  };

  const findBestActivityMatch = (allActivities, recName) => {
    const target = String(recName || "").trim().toLowerCase();
    if (!target) return null;

    const exact = allActivities.find((a) => (a.name || "").trim().toLowerCase() === target);
    if (exact) return exact;

    return allActivities.find((a) => {
      const name = (a.name || "").trim().toLowerCase();
      return name.includes(target) || target.includes(name);
    }) || null;
  };

  const buildExplanationMap = (explanations) => {
    const map = new Map();
    if (!Array.isArray(explanations)) return map;

    explanations.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const activity = String(item.activity || "").trim().toLowerCase();
      const explanation = String(item.explanation || "").trim();
      if (activity && explanation) {
        map.set(activity, explanation);
      }
    });

    return map;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subRes, activitiesRes] = await Promise.all([
          fetch(`${API_GATEWAY}/quiz/submissions/${submissionId}`),
          fetch(`${API_GATEWAY}/getAllActivities`),
        ]);

        if (!subRes.ok) throw new Error("Submission not found");
        const sub = await subRes.json();
        setSubmission(sub);

        const activitiesData = await activitiesRes.json();
        const allActivities = activitiesData.activities || [];
        if (!allActivities.length) {
          throw new Error("No activities available");
        }

        const recommendation = sub.recommendation || {};
        const rankedNames = normalizeRankedActivities(recommendation);
        if (!rankedNames.length) {
          throw new Error("Your recommendation is still being generated. Please refresh in a few seconds.");
        }
        const explanationsMap = buildExplanationMap(recommendation.explanations);

        const topName = rankedNames[0] || "";
        const topMatch = findBestActivityMatch(allActivities, topName) || allActivities[0];
        const confidence = normalizeConfidence(recommendation.confidence, 0.5);
        const topReason = explanationsMap.get((topName || topMatch?.name || "").toLowerCase()) || recommendation.reason;

        setRecommended({
          ...topMatch,
          aiReason: topReason,
          confidence,
        });

        const usedIds = new Set([topMatch?.id]);
        const secondaryCards = rankedNames.slice(1, 3)
          .map((name) => {
            const match = findBestActivityMatch(allActivities, name);
            if (!match || usedIds.has(match.id)) return null;
            usedIds.add(match.id);
            return {
              ...match,
              aiReason: explanationsMap.get(name.toLowerCase()) || "",
            };
          })
          .filter(Boolean);

        const fallbackCards = allActivities
          .filter((a) => !usedIds.has(a.id))
          .slice(0, Math.max(0, 3 - secondaryCards.length));
        setOtherActivities([...secondaryCards, ...fallbackCards]);
        setLoading(false);

        setTimeout(() => setConfWidth(confidence * 100), 200);
      } catch (e) {
        setError(e.message || "Something went wrong");
        setLoading(false);
      }
    };

    loadData();
  }, [submissionId]);

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="rec-loading">
        <div className="rec-loader-ring" />
        <p className="rec-loading-title">Curating your experience…</p>
        <p className="rec-loading-sub">Matching your preferences</p>
      </div>
    </>
  );

  if (error || !recommended) return (
    <>
      <style>{styles}</style>
      <div className="rec-error-wrap">
        <span className="rec-error-icon">✦</span>
        <h2 className="rec-error-title">We couldn't find your result</h2>
        <p className="rec-error-text">{error || "The recommendation may still be processing."}</p>
        <button className="rec-cta" style={{ maxWidth: 200 }} onClick={() => navigate("/quiz")}>
          Retake Quiz
        </button>
      </div>
    </>
  );

  const confidencePct = Math.round((recommended.confidence ?? 0.5) * 100);

  return (
    <>
      <style>{styles}</style>
      <div className="rec-root">

        {/* Hero */}
        <div className="rec-hero">
          <button className="rec-hero-back" onClick={() => navigate("/activities")}>
            ← Browse All Activities
          </button>

          <p className="rec-hero-eyebrow">Your AI Recommendation</p>
          <h1 className="rec-hero-title">
            We found your <em>perfect</em> match.
          </h1>
          <p className="rec-hero-sub">
            Based on your preferences, our AI has curated the ideal experience for you at Café de Paris.
          </p>

          <div className="rec-confidence-wrap">
            <span className="rec-confidence-label">Match confidence</span>
            <div className="rec-confidence-bar-track">
              <div className="rec-confidence-bar-fill" style={{ width: `${confWidth}%` }} />
            </div>
            <span className="rec-confidence-pct">{confidencePct}%</span>
          </div>
        </div>

        {/* Body */}
        <div className="rec-body">

          {/* Main recommendation card */}
          <div className="rec-card">
            <div className="rec-card-inner">

              <div className="rec-card-img-wrap">
                <img src={recommended.image} alt={recommended.name} className="rec-card-img" />
                <div className="rec-card-img-overlay" />
                <span className="rec-card-img-badge">✦ Top Pick</span>
              </div>

              <div className="rec-card-content">
                <div>
                  <div className="rec-ai-chip">
                    <span className="rec-ai-dot" />
                    AI Recommended
                  </div>

                  <span className="rec-card-badge">{recommended.category}</span>
                  <h2 className="rec-card-title">{recommended.name}</h2>
                  <div className="rec-card-divider" />

                  <p className="rec-card-reason-label">Why this is perfect for you</p>
                  <p className="rec-card-reason">
                    {recommended.aiReason || recommended.description}
                  </p>
                </div>

                <div>
                  <div className="rec-card-meta">
                    <div className="rec-meta-item">
                      <span className="rec-meta-label">Duration</span>
                      <span className="rec-meta-value">{recommended.duration}</span>
                    </div>
                    <div className="rec-meta-item">
                      <span className="rec-meta-label">Level</span>
                      <span className="rec-meta-value">{recommended.level}</span>
                    </div>
                    <div className="rec-meta-item">
                      <span className="rec-meta-label">Rating</span>
                      <span className="rec-meta-value">⭐ {recommended.rating} ({recommended.reviews})</span>
                    </div>
                  </div>

                  <div className="rec-price-row">
                    <span className="rec-price-currency">$</span>
                    <span className="rec-price-amount">{recommended.price}</span>
                    <span className="rec-price-note">per person</span>
                  </div>

                  <button
                    className="rec-cta"
                    onClick={() => navigate(`/activity/${recommended.id}`)}
                  >
                    Book This Experience →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Other activities */}
          {otherActivities.length > 0 && (
            <>
              <p className="rec-also-label">You might also enjoy</p>
              <div className="rec-also-grid">
                {otherActivities.map(act => (
                  <div
                    key={act.id}
                    className="rec-also-card"
                    onClick={() => navigate(`/activity/${act.id}`)}
                  >
                    <img src={act.image} alt={act.name} className="rec-also-img" />
                    <div className="rec-also-body">
                      <p className="rec-also-name">{act.name}</p>
                      <p className="rec-also-meta">{act.category} · {act.duration}</p>
                      <p className="rec-also-price">${act.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="rec-retake">
            <button className="rec-retake-btn" onClick={() => navigate("/quiz")}>
              Retake the quiz to explore other options
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
