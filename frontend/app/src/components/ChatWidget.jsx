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

  /* ── Floating button ── */
  .chat-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c, #b38d5e);
    color: #fff;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(201,168,124,0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 9999;
  }
  .chat-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 24px rgba(201,168,124,0.55);
  }
  .chat-fab-open {
    transform: scale(0.9);
    box-shadow: 0 2px 8px rgba(201,168,124,0.3);
  }

  /* ── Chat popup ── */
  .chat-popup {
    position: fixed;
    bottom: 96px;
    right: 24px;
    width: 380px;
    max-width: calc(100vw - 48px);
    height: 520px;
    max-height: calc(100vh - 140px);
    border-radius: 16px;
    background: #faf8f5;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    z-index: 9998;
    overflow: hidden;
    animation: chat-popup-in 0.25s ease;
    font-family: 'DM Sans', sans-serif;
  }
  @keyframes chat-popup-in {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ── Popup header ── */
  .chat-popup-header {
    background: #1a1612;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .chat-popup-brand {
    font-family: 'Playfair Display', serif;
    font-size: 0.9rem;
    color: #faf8f5;
    font-weight: 700;
  }
  .chat-popup-brand span { color: #c9a87c; }
  .chat-popup-progress {
    font-size: 0.65rem;
    color: #aaa098;
    background: rgba(255,255,255,0.08);
    padding: 3px 10px;
    border-radius: 100px;
  }
  .chat-popup-close {
    background: none;
    border: none;
    color: #aaa098;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
    transition: color 0.2s;
  }
  .chat-popup-close:hover { color: #faf8f5; }

  /* ── Messages area ── */
  .chat-popup-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ── Message bubbles ── */
  .chat-msg {
    display: flex;
    gap: 8px;
    animation: chat-fade-in 0.3s ease;
  }
  @keyframes chat-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .chat-msg.bot { align-self: flex-start; }
  .chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }

  .chat-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    flex-shrink: 0;
  }
  .chat-msg.bot .chat-avatar { background: #c9a87c; color: #fff; }
  .chat-msg.user .chat-avatar { background: #1a1612; color: #faf8f5; }

  .chat-bubble {
    max-width: 82%;
    padding: 10px 13px;
    border-radius: 14px;
    font-size: 0.85rem;
    line-height: 1.5;
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
    font-size: 0.92rem;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .chat-bubble-category {
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #c9a87c;
    font-weight: 500;
    margin-bottom: 4px;
  }

  /* ── Edit button ── */
  .chat-edit-btn {
    position: absolute;
    top: 4px;
    right: 6px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.7rem;
    opacity: 0.5;
    transition: opacity 0.2s;
    padding: 2px 3px;
  }
  .chat-edit-btn:hover { opacity: 1; }

  /* ── Typing indicator ── */
  .chat-typing {
    display: flex;
    gap: 4px;
    padding: 8px 13px;
    align-items: center;
  }
  .chat-typing-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #c9a87c;
    animation: chat-bounce 1.2s ease-in-out infinite;
  }
  .chat-typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .chat-typing-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes chat-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }

  /* ── Input area ── */
  .chat-popup-input {
    border-top: 1px solid #ede8e1;
    padding: 10px 12px;
    background: #fff;
    flex-shrink: 0;
  }
  .chat-popup-input-wrap {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  .chat-popup-input textarea {
    flex: 1;
    border: 1.5px solid #e2dbd2;
    border-radius: 20px;
    padding: 8px 14px;
    font-size: 0.85rem;
    font-family: 'DM Sans', sans-serif;
    resize: none;
    max-height: 80px;
    line-height: 1.45;
    transition: border-color 0.2s;
    background: #faf8f5;
    color: #241c17;
  }
  .chat-popup-input textarea:focus { outline: none; border-color: #c9a87c; }
  .chat-popup-input textarea::placeholder { color: #aaa098; }
  .chat-popup-send {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #1a1612;
    color: #faf8f5;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    transition: background 0.2s, transform 0.15s;
    flex-shrink: 0;
  }
  .chat-popup-send:hover:not(:disabled) { background: #c9a87c; transform: scale(1.05); }
  .chat-popup-send:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Section divider ── */
  .chat-section-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
    align-self: center;
  }
  .chat-section-line { flex: 1; max-width: 60px; height: 1px; background: #e2dbd2; }
  .chat-section-label {
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #bdb4a8;
    white-space: nowrap;
  }

  /* ── Submit button ── */
  .chat-popup-submit {
    display: block;
    width: 100%;
    padding: 11px 16px;
    background: linear-gradient(135deg, #c9a87c, #b38d5e);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: transform 0.15s, box-shadow 0.2s;
    margin-top: 8px;
  }
  .chat-popup-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(201,168,124,0.3);
  }

  /* ── Mini loading ── */
  .chat-popup-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
  }
  .chat-popup-loader-ring {
    width: 28px;
    height: 28px;
    border: 2.5px solid #e2dbd2;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: chat-spin 0.9s linear infinite;
  }
  @keyframes chat-spin { to { transform: rotate(360deg); } }
  .chat-popup-loading-text {
    font-family: 'Playfair Display', serif;
    font-size: 0.85rem;
    color: #1a1612;
    text-align: center;
  }

  /* ── Error ── */
  .chat-popup-error {
    background: #fff3f0;
    border: 1px solid #f5c5b8;
    color: #b04a2e;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.78rem;
    text-align: center;
    margin: 8px 12px;
  }

  /* ── Scrollbar ── */
  .chat-popup-messages::-webkit-scrollbar { width: 4px; }
  .chat-popup-messages::-webkit-scrollbar-track { background: transparent; }
  .chat-popup-messages::-webkit-scrollbar-thumb { background: #e2dbd2; border-radius: 4px; }
`;

export default function ChatWidget() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
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
  const [initialized, setInitialized] = useState(false);

  const USER_ID = "user-" + (localStorage.getItem("quiz_user_id") || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("quiz_user_id", id);
    return id;
  })());

  // Initialize session when popup is first opened
  useEffect(() => {
    if (!isOpen || initialized) return;

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

        setMessages([
          {
            type: "bot",
            text: "Welcome! I'd love to help you discover your perfect creative experience. Let's start with a few questions — just answer in your own words.",
          },
        ]);

        setTimeout(() => {
          addQuestionMessage(data.questions, 0);
        }, 600);

        setLoading(false);
        setInitialized(true);
      } catch {
        setError("Could not start quiz session. Please try again.");
        setLoading(false);
      }
    };
    startSession();
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input
  useEffect(() => {
    if (isOpen && !isTyping && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [messages, isTyping, isOpen]);

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

    setMessages(prev => [...prev, {
      type: "user",
      questionId: q.question_id,
      text,
    }]);

    setAnswers(prev => ({ ...prev, [q.question_id]: text }));
    submitAnswer(q.question_id, text);
    setInputValue("");
    setEditingQuestionId(null);

    if (currentQIndex < questions.length - 1) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const nextIndex = currentQIndex + 1;
        setCurrentQIndex(nextIndex);
        addQuestionMessage(questions, nextIndex);
      }, 500);
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

    setAnswers(prev => ({ ...prev, [editingQuestionId]: text }));
    setMessages(prev =>
      prev.map(msg =>
        msg.type === "user" && msg.questionId === editingQuestionId
          ? { ...msg, text }
          : msg
      )
    );
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
      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Submit failed:", res.status, errorBody);
        throw new Error(`Submission failed with status ${res.status}: ${errorBody}`);
      }
      const data = await res.json();
      setIsOpen(false);
      navigate(`/quiz/result/${data.submission_id}`);
    } catch (err) {
      console.error("handleFinalSubmit error:", err);
      setError(err.message || "Something went wrong. Please try again.");
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

  return (
    <>
      <style>{styles}</style>

      {/* Floating action button */}
      <button
        className={`chat-fab${isOpen ? " chat-fab-open" : ""}`}
        onClick={() => setIsOpen(prev => !prev)}
        title="Chat with our assistant"
      >
        {isOpen ? "✕" : "✦"}
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="chat-popup">
          {/* Header */}
          <div className="chat-popup-header">
            <span className="chat-popup-brand">Café de <span>Paris</span></span>
            {progress && <span className="chat-popup-progress">{progress} answered</span>}
            <button className="chat-popup-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="chat-popup-loading">
              <div className="chat-popup-loader-ring" />
              <p className="chat-popup-loading-text">Preparing your quiz…</p>
            </div>
          )}

          {/* Messages */}
          {!loading && (
            <div className="chat-popup-messages">
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

              {allAnswered && !submitting && (
                <button className="chat-popup-submit" onClick={handleFinalSubmit}>
                  Submit & Get My Personality Profile →
                </button>
              )}

              {error && <div className="chat-popup-error">{error}</div>}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          {!loading && !allAnswered && !submitting && (
            <div className="chat-popup-input">
              <div className="chat-popup-input-wrap">
                <textarea
                  ref={inputRef}
                  className="chat-popup-input"
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
                  className="chat-popup-send"
                  onClick={editingQuestionId ? handleEditSubmit : handleSend}
                  disabled={!inputValue.trim() || !currentQ}
                >
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
