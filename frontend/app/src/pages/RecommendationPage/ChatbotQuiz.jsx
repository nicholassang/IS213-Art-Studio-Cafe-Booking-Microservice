import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_GATEWAY = "http://localhost:8000";

const CATEGORY_LABELS = {
  food_and_drink: "Food & Drink",
  activity_preferences: "Activity Preferences",
  ambience_and_vibe: "Ambience & Vibe",
  visit_style_and_occasion: "Visit Style & Occasion",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .chat-root {
    font-family: 'DM Sans', sans-serif;
    background: #faf8f5;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .chat-header {
    background: #1a1612;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .chat-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    color: #faf8f5;
    font-weight: 700;
  }
  .chat-header-brand span { color: #c9a87c; }
  .chat-header-progress {
    font-size: 0.75rem;
    color: #aaa098;
    background: rgba(255,255,255,0.08);
    padding: 4px 12px;
    border-radius: 100px;
  }

  /* ── Messages area ── */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px 16px 120px;
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── Message bubbles ── */
  .chat-msg {
    display: flex;
    gap: 10px;
    animation: chat-fade-in 0.35s ease;
  }
  @keyframes chat-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .chat-msg.bot { align-self: flex-start; }
  .chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }

  .chat-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    flex-shrink: 0;
  }
  .chat-msg.bot .chat-avatar {
    background: #c9a87c;
    color: #fff;
  }
  .chat-msg.user .chat-avatar {
    background: #1a1612;
    color: #faf8f5;
  }

  .chat-bubble {
    max-width: 80%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 0.92rem;
    line-height: 1.55;
    position: relative;
  }
  .chat-msg.bot .chat-bubble {
    background: #fff;
    border: 1px solid #ede8e1;
    border-top-left-radius: 4px;
    color: #241c17;
  }
  .chat-msg.user .chat-bubble {
    background: #1a1612;
    color: #faf8f5;
    border-top-right-radius: 4px;
  }

  .chat-bubble-question {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .chat-bubble-category {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #c9a87c;
    font-weight: 500;
    margin-bottom: 6px;
  }

  /* ── Edit button on user answers ── */
  .chat-edit-btn {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    opacity: 0.5;
    transition: opacity 0.2s;
    padding: 2px 4px;
  }
  .chat-edit-btn:hover { opacity: 1; }
  .chat-msg.bot .chat-edit-btn { color: #c9a87c; }
  .chat-msg.user .chat-edit-btn { color: #c9a87c; }

  /* ── Typing indicator ── */
  .chat-typing {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    align-items: center;
  }
  .chat-typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c9a87c;
    animation: chat-bounce 1.2s ease-in-out infinite;
  }
  .chat-typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .chat-typing-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes chat-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }

  /* ── Input area ── */
  .chat-input-area {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-top: 1px solid #ede8e1;
    padding: 16px;
    z-index: 100;
  }
  .chat-input-wrap {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  .chat-input {
    flex: 1;
    border: 1.5px solid #e2dbd2;
    border-radius: 24px;
    padding: 12px 18px;
    font-size: 0.92rem;
    font-family: 'DM Sans', sans-serif;
    resize: none;
    max-height: 120px;
    line-height: 1.5;
    transition: border-color 0.2s;
    background: #faf8f5;
  }
  .chat-input:focus {
    outline: none;
    border-color: #c9a87c;
  }
  .chat-input::placeholder { color: #aaa098; }
  .chat-send-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #1a1612;
    color: #faf8f5;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    transition: background 0.2s, transform 0.15s;
    flex-shrink: 0;
  }
  .chat-send-btn:hover:not(:disabled) {
    background: #c9a87c;
    transform: scale(1.05);
  }
  .chat-send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ── Section divider ── */
  .chat-section-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0;
    align-self: center;
  }
  .chat-section-line {
    flex: 1;
    max-width: 80px;
    height: 1px;
    background: #e2dbd2;
  }
  .chat-section-label {
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #bdb4a8;
    white-space: nowrap;
  }

  /* ── Submit button ── */
  .chat-submit-btn {
    display: block;
    width: 100%;
    max-width: 720px;
    margin: 12px auto 0;
    padding: 14px 24px;
    background: linear-gradient(135deg, #c9a87c, #b38d5e);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: transform 0.15s, box-shadow 0.2s;
  }
  .chat-submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(201,168,124,0.35);
  }

  /* ── Loading overlay ── */
  .chat-loading-overlay {
    position: fixed;
    inset: 0;
    background: #faf8f5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    z-index: 200;
    animation: chat-fade-in 0.3s ease;
  }
  .chat-loader-ring {
    width: 48px;
    height: 48px;
    border: 3px solid #e2dbd2;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: chat-spin 0.9s linear infinite;
  }
  @keyframes chat-spin { to { transform: rotate(360deg); } }
  .chat-loading-text {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    color: #1a1612;
    text-align: center;
  }
  .chat-loading-sub {
    font-size: 0.82rem;
    color: #aaa098;
    margin-top: -12px;
    text-align: center;
  }

  /* ── Error ── */
  .chat-error {
    background: #fff3f0;
    border: 1px solid #f5c5b8;
    color: #b04a2e;
    border-radius: 10px;
    padding: 12px 18px;
    font-size: 0.85rem;
    text-align: center;
    max-width: 720px;
    margin: 16px auto;
  }
`;

export default function ChatbotQuiz() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const USER_ID = "user-" + (localStorage.getItem("quiz_user_id") || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("quiz_user_id", id);
    return id;
  })());

  // Start session on mount
  useEffect(() => {
    const startSession = async () => {
      try {
        const res = await fetch(`${API_GATEWAY}/quiz/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: USER_ID }),
        });
        if (!res.ok) throw new Error("Failed to start session");
        const data = await res.json();
        setSessionId(data.session_id);
        setQuestions(data.questions);

        // Add welcome message
        setMessages([
          {
            type: "bot",
            text: "Welcome! I'd love to help you discover your perfect creative experience. Let's start with a few questions — just answer in your own words.",
          },
        ]);

        // Add first question after a short delay
        setTimeout(() => {
          addQuestionMessage(data.questions, 0);
        }, 800);

        setLoading(false);
      } catch {
        setError("Could not start quiz session. Please try again.");
        setLoading(false);
      }
    };
    startSession();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when new question appears
  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [messages, isTyping]);

  const addQuestionMessage = (qs, index) => {
    const q = qs[index];
    const prevCategory = index > 0 ? qs[index - 1]?.category : null;
    const categoryChanged = q && prevCategory !== q.category;

    const newMessages = [];
    if (categoryChanged && index > 0) {
      newMessages.push({ type: "divider", category: q.category });
    }
    newMessages.push({
      type: "bot",
      category: q.category,
      questionId: q.question_id,
      text: q.text,
    });
    setMessages(prev => [...prev, ...newMessages]);
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !questions[currentQIndex]) return;

    const q = questions[currentQIndex];

    // Add user message
    setMessages(prev => [...prev, {
      type: "user",
      questionId: q.question_id,
      text,
    }]);

    // Store answer
    setAnswers(prev => ({ ...prev, [q.question_id]: text }));

    // Send answer to backend
    submitAnswer(q.question_id, text);

    setInputValue("");
    setEditingQuestionId(null);

    // Move to next question or show submit button
    if (currentQIndex < questions.length - 1) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const nextIndex = currentQIndex + 1;
        setCurrentQIndex(nextIndex);
        addQuestionMessage(questions, nextIndex);
      }, 600);
    }
  };

  const submitAnswer = async (questionId, text) => {
    if (!sessionId) return;
    try {
      await fetch(`${API_GATEWAY}/quiz/session/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, answer_text: text }),
      });
    } catch (err) {
      console.error("Failed to submit answer:", err);
    }
  };

  const handleEdit = (questionId) => {
    setEditingQuestionId(questionId);
    setInputValue(answers[questionId] || "");
    inputRef.current?.focus();
  };

  const handleEditSubmit = () => {
    const text = inputValue.trim();
    if (!text || !editingQuestionId) return;

    // Update answer locally
    setAnswers(prev => ({ ...prev, [editingQuestionId]: text }));

    // Update message in the list
    setMessages(prev =>
      prev.map(msg =>
        msg.type === "user" && msg.questionId === editingQuestionId
          ? { ...msg, text }
          : msg
      )
    );

    // Send update to backend
    submitAnswer(editingQuestionId, text);

    setInputValue("");
    setEditingQuestionId(null);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_GATEWAY}/quiz/session/${sessionId}/submit`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      navigate(`/quiz/result/${data.submission_id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingQuestionId) {
        handleEditSubmit();
      } else {
        handleSend();
      }
    }
  };

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;
  const currentQ = questions[currentQIndex];
  const progress = questions.length ? `${Object.keys(answers).length}/${questions.length}` : "";

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="chat-loading-overlay">
          <div className="chat-loader-ring" />
          <p className="chat-loading-text">Preparing your quiz…</p>
          <p className="chat-loading-sub">Just a moment</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="chat-root">

        {/* Header */}
        <div className="chat-header">
          <span className="chat-header-brand">Café de <span>Paris</span></span>
          <span className="chat-header-progress">{progress} answered</span>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, i) => {
            if (msg.type === "divider") {
              return (
                <div key={`div-${i}`} className="chat-section-divider">
                  <div className="chat-section-line" />
                  <span className="chat-section-label">
                    {CATEGORY_LABELS[msg.category] || msg.category}
                  </span>
                  <div className="chat-section-line" />
                </div>
              );
            }

            if (msg.type === "bot") {
              return (
                <div key={`bot-${i}`} className="chat-msg bot">
                  <div className="chat-avatar">✦</div>
                  <div className="chat-bubble">
                    <div className="chat-bubble-category">
                      {CATEGORY_LABELS[msg.category] || msg.category}
                    </div>
                    <div className="chat-bubble-question">{msg.text}</div>
                  </div>
                </div>
              );
            }

            if (msg.type === "user") {
              return (
                <div key={`user-${i}`} className="chat-msg user">
                  <div className="chat-avatar">You</div>
                  <div className="chat-bubble" style={{ position: "relative" }}>
                    {msg.text}
                    <button
                      className="chat-edit-btn"
                      onClick={() => handleEdit(msg.questionId)}
                      title="Edit answer"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="chat-msg bot">
              <div className="chat-avatar">✦</div>
              <div className="chat-bubble">
                <div className="chat-typing">
                  <div className="chat-typing-dot" />
                  <div className="chat-typing-dot" />
                  <div className="chat-typing-dot" />
                </div>
              </div>
            </div>
          )}

          {/* Final submit button */}
          {allAnswered && !submitting && (
            <button className="chat-submit-btn" onClick={handleFinalSubmit}>
              Submit & Get My Personality Profile →
            </button>
          )}

          {error && <div className="chat-error">{error}</div>}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {!allAnswered && !submitting && (
          <div className="chat-input-area">
            <div className="chat-input-wrap">
              <textarea
                ref={inputRef}
                className="chat-input"
                rows={1}
                placeholder={
                  editingQuestionId
                    ? "Edit your answer…"
                    : currentQ
                    ? "Type your answer…"
                    : "Loading…"
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!currentQ}
              />
              <button
                className="chat-send-btn"
                onClick={editingQuestionId ? handleEditSubmit : handleSend}
                disabled={!inputValue.trim() || !currentQ}
              >
                ↑
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
