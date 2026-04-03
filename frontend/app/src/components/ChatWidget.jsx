import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_GATEWAY, CATEGORY_LABELS, getOrCreateUserId } from "../constants";
import { useAuth } from "../context/AuthContext";

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

  /* ── Header ── */
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

  /* ── Progress counter ── */
  .chat-popup-progress-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 100px;
  }
  .chat-popup-progress-text {
    font-size: 0.72rem;
    font-weight: 600;
    color: #c9a87c;
    letter-spacing: 0.03em;
  }
  .chat-popup-progress-text span {
    color: #7c6f5e;
    font-weight: 400;
  }
  .chat-popup-progress-bar-track {
    width: 100%;
    height: 3px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .chat-popup-progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #e8c99a);
    border-radius: 2px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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

  /* ── Messages ── */
  .chat-popup-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .chat-popup-messages::-webkit-scrollbar { width: 4px; }
  .chat-popup-messages::-webkit-scrollbar-track { background: transparent; }
  .chat-popup-messages::-webkit-scrollbar-thumb { background: #e2dbd2; border-radius: 4px; }

  /* ── Bubbles ── */
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
    padding-right: 34px;
  }

  .chat-bubble-category {
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #c9a87c;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .chat-bubble-question {
    font-family: 'Playfair Display', serif;
    font-size: 0.92rem;
    font-weight: 600;
  }

  /* ── Edit button ── */
  .chat-edit-btn {
    position: absolute;
    top: 6px;
    right: 8px;
    background: rgba(255,255,255,0.15);
    border: none;
    cursor: pointer;
    font-size: 0.7rem;
    opacity: 0.7;
    transition: opacity 0.2s, background 0.2s;
    padding: 3px 5px;
    border-radius: 4px;
    line-height: 1;
  }
  .chat-edit-btn:hover { opacity: 1; background: rgba(255,255,255,0.25); }

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

  /* ── Input ── */
  .chat-popup-input-area {
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
  .chat-popup-textarea {
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
  .chat-popup-textarea:focus { outline: none; border-color: #c9a87c; }
  .chat-popup-textarea::placeholder { color: #aaa098; }

  .chat-send-btn {
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
  .chat-send-btn:hover:not(:disabled) { background: #c9a87c; transform: scale(1.05); }
  .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Submit button ── */
  .chat-submit-btn {
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
  .chat-submit-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(201,168,124,0.3);
  }

  /* ── Loading ── */
  .chat-popup-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
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
    margin: 0 4px;
  }
`;

export default function ChatWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Stable user ID — never recomputed on re-render
  const userId = useRef(getOrCreateUserId()).current;

  const [isOpen, setIsOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
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
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Listen for custom event to reopen the quiz (from ResultPage retake button)
  useEffect(() => {
    const handleRetakeQuiz = () => {
      resetQuiz();
      setIsOpen(true);
    };
    window.addEventListener("retake-quiz", handleRetakeQuiz);
    return () => window.removeEventListener("retake-quiz", handleRetakeQuiz);
  }, []);

  const resetQuiz = () => {
    setInitialized(false);
    setSessionId(null);
    setQuestions([]);
    setCurrentQIndex(0);
    setAnswers({});
    setInputValue("");
    setMessages([]);
    setIsTyping(false);
    setLoading(true);
    setError(null);
    setSubmitting(false);
    setEditingQuestionId(null);
    setHasSubmitted(false);
  };

  // Start session only once, when popup is first opened
  useEffect(() => {
    if (!isOpen || initialized) return;

    const startSession = async () => {
      try {
        const res = await fetch(`${API_GATEWAY}/quiz/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        if (!res.ok) throw new Error("Failed to start session");
        const data = await res.json();

        setSessionId(data.session_id);
        setQuestions(data.questions);
        setMessages([{
          type: "bot",
          text: "Welcome! I'd love to help you discover your perfect creative experience. Let's start with a few questions — just answer in your own words.",
        }]);

        setTimeout(() => addQuestionMessage(data.questions, 0), 600);
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
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Focus input after new message
  useEffect(() => {
    if (isOpen && !isTyping) inputRef.current?.focus();
  }, [messages, isTyping, isOpen]);

  const addQuestionMessage = (qs, index) => {
    const q = qs[index];
    const prevCategory = index > 0 ? qs[index - 1]?.category : null;
    const newMessages = [];

    if (q.category !== prevCategory && index > 0) {
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

  const submitAnswerToBackend = async (questionId, text, isEdit = false) => {
    if (!sessionId) return;
    try {
      const url = isEdit
        ? `${API_GATEWAY}/quiz/session/${sessionId}/answer/${questionId}`
        : `${API_GATEWAY}/quiz/session/${sessionId}/answer`;
      const method = isEdit ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, answer_text: text }),
      });
    } catch (err) {
      console.error("Failed to submit answer:", err);
    }
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !questions[currentQIndex]) return;

    const q = questions[currentQIndex];
    setMessages(prev => [...prev, { type: "user", questionId: q.question_id, text }]);
    setAnswers(prev => ({ ...prev, [q.question_id]: text }));
    submitAnswerToBackend(q.question_id, text, false);
    setInputValue("");

    if (currentQIndex < questions.length - 1) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const next = currentQIndex + 1;
        setCurrentQIndex(next);
        addQuestionMessage(questions, next);
      }, 500);
    }
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
    submitAnswerToBackend(editingQuestionId, text, true);
    setInputValue("");
    setEditingQuestionId(null);
  };

  const handleEdit = (questionId) => {
    setEditingQuestionId(questionId);
    setInputValue(answers[questionId] || "");
    setIsTyping(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_GATEWAY}/quiz/session/${sessionId}/submit?authenticated=${!!user}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
      const data = await res.json();

      // Cache the recommendation so the ResultPage can use it immediately.
      // For unauthenticated users the result is NOT in Supabase, so polling
      // would timeout — sessionStorage is the fallback.
      if (data.recommendation) {
        sessionStorage.setItem(
          `quiz_result_${data.submission_id}`,
          JSON.stringify(data.recommendation)
        );
      }

      setHasSubmitted(true);
      setEditingQuestionId(null);
      setInputValue("");
      setIsOpen(false);
      navigate(`/quiz/result/${data.submission_id}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      editingQuestionId ? handleEditSubmit() : handleSend();
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
        title="Discover your creative profile"
      >
        {isOpen ? "✕" : "✦"}
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="chat-popup">
          {/* Header */}
          <div className="chat-popup-header">
            <span className="chat-popup-brand">Café de <span>Paris</span></span>
            {progress && (
              <div className="chat-popup-progress-wrap">
                <div className="chat-popup-progress-text">{progress} <span>answered</span></div>
                <div className="chat-popup-progress-bar-track">
                  <div
                    className="chat-popup-progress-bar-fill"
                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
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
                if (msg.type === "divider") return (
                  <div key={`div-${i}`} className="chat-section-divider">
                    <div className="chat-section-line" />
                    <span className="chat-section-label">
                      {CATEGORY_LABELS[msg.category] || msg.category}
                    </span>
                    <div className="chat-section-line" />
                  </div>
                );

                if (msg.type === "bot") return (
                  <div key={`bot-${i}`} className="chat-msg bot">
                    <div className="chat-avatar">✦</div>
                    <div className="chat-bubble">
                      {msg.category && (
                        <div className="chat-bubble-category">
                          {CATEGORY_LABELS[msg.category] || msg.category}
                        </div>
                      )}
                      <div className="chat-bubble-question">{msg.text}</div>
                    </div>
                  </div>
                );

                if (msg.type === "user") return (
                  <div key={`user-${i}`} className="chat-msg user">
                    <div className="chat-avatar">You</div>
                    <div className="chat-bubble">
                      {msg.text}
                      <button
                        className="chat-edit-btn"
                        onClick={() => handleEdit(msg.questionId)}
                        title="Edit answer"
                      >✏️</button>
                    </div>
                  </div>
                );

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

              {allAnswered && !submitting && !hasSubmitted && !editingQuestionId && (
                <button className="chat-submit-btn" onClick={handleFinalSubmit}>
                  Submit & Get My Personality Profile →
                </button>
              )}

              {error && <div className="chat-popup-error">{error}</div>}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input — show when: quiz not all answered, or editing an existing answer */}
          {!loading && !submitting && (!allAnswered || editingQuestionId) && (
            <div className="chat-popup-input-area">
              <div className="chat-popup-input-wrap">
                <textarea
                  ref={inputRef}
                  className="chat-popup-textarea"
                  rows={1}
                  placeholder={editingQuestionId ? "Edit your answer…" : currentQ ? "Type your answer…" : "Loading…"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="chat-send-btn"
                  onClick={editingQuestionId ? handleEditSubmit : handleSend}
                  disabled={!inputValue.trim()}
                >↑</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
