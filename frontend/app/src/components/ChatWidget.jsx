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
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    color: #fff;
    border: none;
    cursor: pointer;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 20px rgba(201,168,124,0.45), 0 2px 6px rgba(0,0,0,0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 9999;
    overflow: hidden;
  }
  .chat-fab::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .chat-fab:hover {
    transform: scale(1.1) rotate(15deg);
    box-shadow: 0 8px 28px rgba(201,168,124,0.6), 0 4px 10px rgba(0,0,0,0.15);
  }
  .chat-fab:hover::before { opacity: 1; }
  .chat-fab:active { transform: scale(0.95) rotate(0deg); }
  .chat-fab-open {
    transform: scale(0.9) rotate(45deg);
    box-shadow: 0 2px 8px rgba(201,168,124,0.3);
  }
  .chat-fab-open:hover {
    transform: scale(0.95) rotate(45deg);
  }

  /* ── Pulse ring animation ── */
  .chat-fab-pulse {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid #c9a87c;
    animation: fab-pulse 2s ease-in-out infinite;
  }
  @keyframes fab-pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 0; }
  }

  /* ── Chat popup ── */
  .chat-popup {
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 400px;
    max-width: calc(100vw - 48px);
    height: 560px;
    max-height: calc(100vh - 140px);
    border-radius: 20px;
    background: linear-gradient(180deg, #faf8f5 0%, #f8f5f0 100%);
    box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    z-index: 9998;
    overflow: hidden;
    animation: chat-popup-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: 'DM Sans', sans-serif;
    backdrop-filter: blur(10px);
  }
  @keyframes chat-popup-in {
    from { opacity: 0; transform: translateY(20px) scale(0.9); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ── Header ── */
  .chat-popup-header {
    background: linear-gradient(135deg, #1a1612 0%, #2a2320 100%);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .chat-popup-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201,168,124,0.5), transparent);
  }
  .chat-popup-brand {
    font-family: 'Playfair Display', serif;
    font-size: 0.95rem;
    color: #faf8f5;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .chat-popup-brand span { color: #c9a87c; }

  /* ── Progress counter ── */
  .chat-popup-progress-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    min-width: 110px;
  }
  .chat-popup-progress-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: #c9a87c;
    letter-spacing: 0.04em;
  }
  .chat-popup-progress-text span {
    color: #8a7d6f;
    font-weight: 400;
  }
  .chat-popup-progress-bar-track {
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }
  .chat-popup-progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #e8c99a);
    border-radius: 3px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  .chat-popup-progress-bar-fill.complete {
    background: linear-gradient(90deg, #c9a87c, #e8c99a, #c9a87c);
    animation: shimmer 2s ease-in-out infinite;
    background-size: 200% 100%;
  }
  @keyframes shimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  .chat-popup-close {
    background: rgba(255,255,255,0.08);
    border: none;
    color: #aaa098;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    border-radius: 8px;
    transition: all 0.2s;
    margin-left: 12px;
  }
  .chat-popup-close:hover { 
    background: rgba(255,255,255,0.15); 
    color: #faf8f5;
    transform: rotate(90deg);
  }

  /* ── Messages ── */
  .chat-popup-messages {
    flex: 1;
    overflow-y: auto;
    padding: 18px 14px 80px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scroll-behavior: smooth;
  }
  .chat-popup-messages::-webkit-scrollbar { width: 5px; }
  .chat-popup-messages::-webkit-scrollbar-track { background: transparent; }
  .chat-popup-messages::-webkit-scrollbar-thumb { background: #d4ccc2; border-radius: 5px; }
  .chat-popup-messages::-webkit-scrollbar-thumb:hover { background: #c4b9ad; }

  /* ── Bubbles ── */
  .chat-msg {
    display: flex;
    gap: 10px;
    animation: chat-fade-in 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes chat-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .chat-msg.bot { align-self: flex-start; }
  .chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }

  .chat-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .chat-msg.bot .chat-avatar { 
    background: linear-gradient(135deg, #c9a87c, #a8845a); 
    color: #fff;
    box-shadow: 0 2px 8px rgba(201,168,124,0.3);
  }
  .chat-msg.user .chat-avatar { 
    background: linear-gradient(135deg, #1a1612, #2a2320); 
    color: #faf8f5;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }

  .chat-bubble {
    max-width: 80%;
    padding: 12px 15px;
    border-radius: 16px;
    font-size: 0.88rem;
    line-height: 1.55;
    position: relative;
    transition: transform 0.2s;
  }
  .chat-msg.bot .chat-bubble {
    background: #fff;
    border: 1px solid #e8e2da;
    border-top-left-radius: 6px;
    color: #241c17;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .chat-msg.user .chat-bubble {
    background: linear-gradient(135deg, #1a1612, #2a2320);
    color: #faf8f5;
    border-top-right-radius: 6px;
    padding-right: 36px;
    box-shadow: 0 3px 10px rgba(26,22,18,0.2);
  }

  .chat-bubble-category {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #c9a87c;
    font-weight: 600;
    margin-bottom: 5px;
    display: inline-block;
    padding: 2px 8px;
    background: rgba(201,168,124,0.1);
    border-radius: 6px;
  }
  .chat-bubble-question {
    font-family: 'Playfair Display', serif;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.4;
  }

  /* ── Edit button ── */
  .chat-edit-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(255,255,255,0.08);
    border: none;
    cursor: pointer;
    opacity: 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 4px;
    border-radius: 5px;
    line-height: 1;
    color: rgba(255,255,255,0.7);
    font-size: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chat-edit-btn::before {
    content: '';
    display: block;
    width: 10px;
    height: 10px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.8)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
  }
  .chat-msg.user:hover .chat-edit-btn { opacity: 1; }
  .chat-edit-btn:hover {
    opacity: 1 !important;
    background: rgba(255,255,255,0.18);
    transform: scale(1.1);
    color: #fff;
  }
  .chat-edit-btn:hover::before {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,1)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E");
  }
  .chat-edit-btn:active { transform: scale(0.95); }

  /* ── Typing indicator ── */
  .chat-typing {
    display: flex;
    gap: 5px;
    padding: 10px 15px;
    align-items: center;
  }
  .chat-typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c9a87c;
    animation: chat-bounce 1.4s ease-in-out infinite;
    box-shadow: 0 0 4px rgba(201,168,124,0.4);
  }
  .chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes chat-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
    30% { transform: translateY(-6px); opacity: 1; }
  }

  /* ── Section divider ── */
  .chat-section-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 0;
    align-self: center;
    animation: chat-fade-in 0.4s ease;
  }
  .chat-section-line { 
    flex: 1; 
    max-width: 70px; 
    height: 1px; 
    background: linear-gradient(90deg, transparent, #d4ccc2, transparent); 
  }
  .chat-section-label {
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #a89d91;
    white-space: nowrap;
    font-weight: 500;
    padding: 3px 10px;
    background: rgba(201,168,124,0.08);
    border-radius: 8px;
  }

  /* ── Input ── */
  .chat-popup-input-area {
    border-top: 1px solid #e8e2da;
    padding: 12px 14px;
    background: linear-gradient(180deg, #fff 0%, #faf8f5 100%);
    flex-shrink: 0;
    position: relative;
  }
  .chat-popup-input-area::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201,168,124,0.3), transparent);
  }
  .chat-popup-input-wrap {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  .chat-popup-textarea {
    flex: 1;
    border: 1.5px solid #e2dbd2;
    border-radius: 22px;
    padding: 10px 16px;
    font-size: 0.88rem;
    font-family: 'DM Sans', sans-serif;
    resize: none;
    max-height: 90px;
    line-height: 1.5;
    transition: all 0.25s;
    background: #fff;
    color: #241c17;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .chat-popup-textarea:focus { 
    outline: none; 
    border-color: #c9a87c;
    box-shadow: 0 0 0 3px rgba(201,168,124,0.15), 0 2px 8px rgba(0,0,0,0.06);
  }
  .chat-popup-textarea::placeholder { color: #b0a79c; }

  .chat-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1a1612, #2a2320);
    color: #faf8f5;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    transition: all 0.25s;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(26,22,18,0.2);
  }
  .chat-send-btn:hover:not(:disabled) { 
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    transform: scale(1.08);
    box-shadow: 0 4px 14px rgba(201,168,124,0.35);
  }
  .chat-send-btn:disabled { 
    opacity: 0.35; 
    cursor: not-allowed;
    transform: none;
  }
  .chat-send-btn:active:not(:disabled) { transform: scale(0.95); }

  /* ── Submit button ── */
  .chat-submit-btn {
    display: block;
    width: 100%;
    padding: 13px 18px;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    margin-top: 10px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(201,168,124,0.3);
  }
  .chat-submit-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }
  .chat-submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201,168,124,0.4);
  }
  .chat-submit-btn:hover::before { left: 100%; }
  .chat-submit-btn:active { transform: translateY(0); }

  /* ── Loading ── */
  .chat-popup-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 14px;
    animation: fade-in 0.4s ease;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .chat-popup-loader-ring {
    width: 32px;
    height: 32px;
    border: 3px solid #e8e2da;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: chat-spin 1s linear infinite;
  }
  @keyframes chat-spin { to { transform: rotate(360deg); } }
  .chat-popup-loading-text {
    font-family: 'Playfair Display', serif;
    font-size: 0.9rem;
    color: #1a1612;
  }

  /* ── Error ── */
  .chat-popup-error {
    background: linear-gradient(135deg, #fff5f2, #ffe8e2);
    border: 1px solid #f5c5b8;
    color: #b04a2e;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 0.82rem;
    text-align: center;
    margin: 0 6px;
    animation: shake 0.4s ease;
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .chat-popup {
      width: calc(100vw - 24px);
      right: 12px;
      bottom: 90px;
      height: calc(100vh - 120px);
      border-radius: 16px;
    }
    .chat-fab {
      bottom: 16px;
      right: 16px;
      width: 54px;
      height: 54px;
    }
  }
`;

export default function ChatWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Stable guest ID — only used when logged out
  const guestUserId = useRef(getOrCreateUserId()).current;

  // Use real username when logged in, fallback to guest ID
  const userId = user ? user.username : guestUserId;

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

  // When auth changes, reset all quiz state so startSession re-runs for the new user
  // We do NOT clear stored data — each user's session is keyed by their userId in localStorage
  useEffect(() => {
    setInitialized(false);
    setSessionId(null);
    setQuestions([]);
    setCurrentQIndex(0);
    setAnswers({});
    setInputValue("");
    setMessages([]);
    setIsTyping(false);
    setEditingQuestionId(null);
    setHasSubmitted(false);
    setSubmitting(false);
    setError(null);
    // Close popup so user sees a clean slate when they reopen it
    setIsOpen(false);
  }, [userId]);

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
    // Clear stored session ID for current user only
    localStorage.removeItem(`quiz_session_id_${userId}`);
  };

  // Start session only once, when popup is first opened
  useEffect(() => {
    if (!isOpen || initialized) return;

    const startSession = async () => {
      try {
        // Check if we have a stored session ID for THIS user
        const storedSessionId = localStorage.getItem(`quiz_session_id_${userId}`);
        
        if (storedSessionId) {
          // Try to restore the session from backend
          const res = await fetch(`${API_GATEWAY}/quiz/session/${storedSessionId}`);
          if (res.ok) {
            const data = await res.json();
            
            setSessionId(data.session_id);
            localStorage.setItem(`quiz_session_id_${userId}`, data.session_id);
            setQuestions(data.questions);
            setAnswers(data.answers);
            
            // Rebuild messages from questions and answers
            const messages = [{
              type: "bot",
              text: "Welcome back! I'd love to help you discover your perfect creative experience. Let's continue where you left off.",
            }];

            // Track answered questions and find the first unanswered one
            let firstUnansweredIndex = -1;

            data.questions.forEach((q, index) => {
              const prevCategory = index > 0 ? data.questions[index - 1]?.category : null;

              if (data.answers[q.question_id]) {
                // Add the question and answer
                messages.push({
                  type: "bot",
                  category: q.category,
                  questionId: q.question_id,
                  text: q.text,
                });
                messages.push({
                  type: "user",
                  questionId: q.question_id,
                  text: data.answers[q.question_id],
                });
              } else if (firstUnansweredIndex === -1) {
                // Only add the FIRST unanswered question
                firstUnansweredIndex = index;
                if (q.category !== prevCategory && index > 0) {
                  messages.push({ type: "divider", category: q.category });
                }
                messages.push({
                  type: "bot",
                  category: q.category,
                  questionId: q.question_id,
                  text: q.text,
                });
              }
            });

            setMessages(messages);

            // Set current question index to the first unanswered question
            const answeredCount = Object.keys(data.answers).length;
            setCurrentQIndex(Math.min(answeredCount, data.questions.length - 1));
            
            setLoading(false);
            setInitialized(true);
            return;
          }
        }

        // If no stored session or restore failed, start a new session
        const res = await fetch(`${API_GATEWAY}/quiz/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        if (!res.ok) throw new Error("Failed to start session");
        const data = await res.json();

        setSessionId(data.session_id);
        localStorage.setItem(`quiz_session_id_${userId}`, data.session_id);
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
  }, [isOpen, userId]);

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

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || !questions[currentQIndex]) return;

    const q = questions[currentQIndex];
    setMessages(prev => [...prev, { type: "user", questionId: q.question_id, text }]);
    setAnswers(prev => ({ ...prev, [q.question_id]: text }));
    setInputValue("");

    // Wait for backend to persist before moving on
    await submitAnswerToBackend(q.question_id, text, false);

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
    setTimeout(() => {
      inputRef.current?.focus();
      const len = (answers[questionId] || "").length;
      inputRef.current?.setSelectionRange(len, len);
    }, 50);
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
      resetQuiz();
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
                    className={`chat-popup-progress-bar-fill${allAnswered ? ' complete' : ''}`}
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
                      />
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

          {/* Submit button — show when all questions are answered */}
          {!loading && !submitting && allAnswered && !hasSubmitted && !editingQuestionId && (
            <div className="chat-popup-input-area">
              <button className="chat-submit-btn" onClick={handleFinalSubmit}>
                Submit & Get My Personality Profile →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
