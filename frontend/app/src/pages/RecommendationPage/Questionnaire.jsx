import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_GATEWAY = "http://localhost:8000";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .quiz-root {
    font-family: 'DM Sans', sans-serif;
    background: #faf8f5;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Progress bar ── */
  .quiz-progress-bar-wrap {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: #e2dbd2;
    z-index: 100;
  }
  .quiz-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #e8c99a);
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
    border-radius: 0 2px 2px 0;
  }

  /* ── Header ── */
  .quiz-header {
    padding: 28px 48px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .quiz-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    color: #1a1612;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .quiz-header-brand span {
    color: #c9a87c;
  }
  .quiz-step-pill {
    font-size: 0.75rem;
    color: #aaa098;
    background: #f0ebe3;
    padding: 5px 14px;
    border-radius: 100px;
    letter-spacing: 0.06em;
    font-weight: 500;
  }

  /* ── Main layout ── */
  .quiz-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px 48px;
  }

  /* ── Category label ── */
  .quiz-category {
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #c9a87c;
    font-weight: 500;
    margin-bottom: 12px;
    text-align: center;
  }

  /* ── Question card ── */
  .quiz-card {
    background: #fff;
    border: 1px solid #ede8e1;
    border-radius: 24px;
    padding: 48px 52px;
    max-width: 680px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(26,22,18,0.06);
    animation: quiz-slide-in 0.4s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes quiz-slide-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .quiz-question-number {
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #aaa098;
    font-weight: 500;
    margin-bottom: 10px;
  }
  .quiz-question-text {
    font-family: 'Playfair Display', serif;
    font-size: 1.65rem;
    line-height: 1.3;
    color: #1a1612;
    font-weight: 700;
    margin-bottom: 32px;
  }

  /* ── Options ── */
  .quiz-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .quiz-option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border: 1.5px solid #e2dbd2;
    border-radius: 12px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
    background: #faf8f5;
    text-align: left;
  }
  .quiz-option:hover {
    border-color: #c9a87c;
    background: #fdf9f4;
    transform: translateX(3px);
  }
  .quiz-option.selected {
    border-color: #c9a87c;
    background: #fdf6ee;
  }
  .quiz-option-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #d9d0c5;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s, background 0.2s;
  }
  .quiz-option.selected .quiz-option-dot {
    border-color: #c9a87c;
    background: #c9a87c;
  }
  .quiz-option-dot-inner {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
    transform: scale(0);
    transition: opacity 0.2s, transform 0.2s;
  }
  .quiz-option.selected .quiz-option-dot-inner {
    opacity: 1;
    transform: scale(1);
  }
  .quiz-option-text {
    font-size: 0.93rem;
    color: #3a3530;
    font-weight: 400;
    line-height: 1.45;
  }
  .quiz-option.selected .quiz-option-text {
    color: #1a1612;
    font-weight: 500;
  }

  /* ── Navigation ── */
  .quiz-nav {
    max-width: 680px;
    width: 100%;
    margin-top: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .quiz-btn-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: #7c6f5e;
    background: transparent;
    border: 1px solid #d9d0c5;
    padding: 10px 20px;
    border-radius: 100px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.02em;
  }
  .quiz-btn-back:hover {
    background: #111;
    color: #fff;
    border-color: #111;
  }
  .quiz-btn-back:disabled {
    opacity: 0.3;
    pointer-events: none;
  }
  .quiz-btn-next {
    padding: 12px 32px;
    background: #1a1612;
    color: #faf8f5;
    border: none;
    border-radius: 100px;
    font-size: 0.93rem;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.04em;
    transition: background 0.2s, transform 0.15s, opacity 0.2s;
  }
  .quiz-btn-next:hover:not(:disabled) {
    background: #c9a87c;
    transform: translateY(-1px);
  }
  .quiz-btn-next:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* ── Dots ── */
  .quiz-dots {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .quiz-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d9d0c5;
    transition: background 0.2s, width 0.2s;
  }
  .quiz-dot.active {
    background: #c9a87c;
    width: 18px;
    border-radius: 3px;
  }
  .quiz-dot.done {
    background: #c9a87c;
    opacity: 0.4;
  }

  /* ── Loading overlay ── */
  .quiz-loading-overlay {
    position: fixed;
    inset: 0;
    background: #faf8f5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    z-index: 200;
    animation: quiz-fade-in 0.3s ease;
  }
  @keyframes quiz-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .quiz-loader-ring {
    width: 52px;
    height: 52px;
    border: 3px solid #e2dbd2;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: quiz-spin 0.9s linear infinite;
  }
  @keyframes quiz-spin {
    to { transform: rotate(360deg); }
  }
  .quiz-loading-text {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    color: #1a1612;
    text-align: center;
  }
  .quiz-loading-sub {
    font-size: 0.85rem;
    color: #aaa098;
    margin-top: -16px;
    text-align: center;
  }

  /* ── Error ── */
  .quiz-error {
    background: #fff3f0;
    border: 1px solid #f5c5b8;
    color: #b04a2e;
    border-radius: 10px;
    padding: 12px 18px;
    font-size: 0.85rem;
    max-width: 680px;
    width: 100%;
    text-align: center;
  }

  /* ── Category divider ── */
  .quiz-section-label {
    max-width: 680px;
    width: 100%;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .quiz-section-line {
    flex: 1;
    height: 1px;
    background: #e2dbd2;
  }
  .quiz-section-text {
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #bdb4a8;
    white-space: nowrap;
  }
`;

const CATEGORY_LABELS = {
  food_and_drink: "Food & Drink",
  activity_preferences: "Activity Preferences",
  ambience_and_vibe: "Ambience & Vibe",
  visit_style_and_occasion: "Visit Style",
};

export default function QuizPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const USER_ID = "user-" + (localStorage.getItem("quiz_user_id") || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("quiz_user_id", id);
    return id;
  })());

  useEffect(() => {
    fetch(`${API_GATEWAY}/quiz/questions`)
      .then(r => r.json())
      .then(data => setQuestions(data))
      .catch(() => setError("Could not load questions. Please try again."));
  }, []);

  if (!questions.length && !error) return (
    <>
      <style>{styles}</style>
      <div className="quiz-loading-overlay">
        <div className="quiz-loader-ring" />
        <p className="quiz-loading-text">Preparing your questions…</p>
        <p className="quiz-loading-sub">Just a moment</p>
      </div>
    </>
  );

  const q = questions[current];
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;
  const selectedOption = q ? answers[q.question_id] : null;
  const prevCategory = current > 0 ? questions[current - 1]?.category : null;
  const categoryChanged = q && prevCategory !== q.category;

  const handleSelect = (optionId) => {
    setAnswers(prev => ({ ...prev, [q.question_id]: optionId }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setError(null);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (current > 0) setCurrent(c => c - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const formattedAnswers = Object.entries(answers).map(([question_id, selected_option_id]) => ({
      question_id,
      selected_option_id,
    }));
    try {
      const res = await fetch(`${API_GATEWAY}/recommend/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, answers: formattedAnswers }),
      });
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      navigate(`/quiz/result/${data.submission_id}`);
    } catch {
      setError("Something went wrong submitting your quiz. Please try again.");
      setSubmitting(false);
    }
  };

  const isLast = current === questions.length - 1;

  return (
    <>
      <style>{styles}</style>

      {submitting && (
        <div className="quiz-loading-overlay">
          <div className="quiz-loader-ring" />
          <p className="quiz-loading-text">Finding your perfect experience…</p>
          <p className="quiz-loading-sub">Our AI is crafting your recommendation</p>
        </div>
      )}

      <div className="quiz-progress-bar-wrap">
        <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-root">
        <div className="quiz-header">
          <span className="quiz-header-brand">Café de <span>Paris</span></span>
          <span className="quiz-step-pill">{current + 1} / {questions.length}</span>
        </div>

        <div className="quiz-main">
          {categoryChanged && (
            <div className="quiz-section-label">
              <div className="quiz-section-line" />
              <span className="quiz-section-text">{CATEGORY_LABELS[q.category] || q.category}</span>
              <div className="quiz-section-line" />
            </div>
          )}

          {q && (
            <>
              <p className="quiz-category" style={{ maxWidth: 680, width: "100%" }}>
                {CATEGORY_LABELS[q.category] || q.category}
              </p>

              <div className="quiz-card" key={q.question_id}>
                <p className="quiz-question-number">Question {current + 1}</p>
                <h2 className="quiz-question-text">{q.text}</h2>
                <div className="quiz-options">
                  {q.options.map(opt => (
                    <button
                      key={opt.option_id}
                      className={`quiz-option${selectedOption === opt.option_id ? " selected" : ""}`}
                      onClick={() => handleSelect(opt.option_id)}
                    >
                      <div className="quiz-option-dot">
                        <div className="quiz-option-dot-inner" />
                      </div>
                      <span className="quiz-option-text">{opt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="quiz-error" style={{ marginTop: 12 }}>{error}</div>
          )}

          <div className="quiz-nav">
            <button className="quiz-btn-back" onClick={handleBack} disabled={current === 0}>
              ← Back
            </button>

            <div className="quiz-dots">
              {questions.slice(Math.max(0, current - 2), current + 3).map((_, i) => {
                const idx = Math.max(0, current - 2) + i;
                return (
                  <div
                    key={idx}
                    className={`quiz-dot${idx === current ? " active" : idx < current ? " done" : ""}`}
                  />
                );
              })}
            </div>

            <button
              className="quiz-btn-next"
              onClick={handleNext}
              disabled={!selectedOption}
            >
              {isLast ? "See My Recommendation →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}