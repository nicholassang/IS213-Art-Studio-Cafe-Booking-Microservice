# quiz-service main.py
import os
import json
import uuid
import random
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, field_validator
from supabase import create_client, Client

from question_bank import QUESTION_BANK

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Clients ───────────────────────────────────────────────────────────────
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)

# ── In-memory session store ───────────────────────────────────────────────
# session_id → { "user_id", "questions": [...], "answers": {question_id: text} }
_sessions: dict[str, dict] = {}

CATEGORIES = ["food_and_drink", "activity_preferences", "ambience_and_vibe", "visit_style_and_occasion"]
QUESTIONS_PER_SECTION = 2
TOTAL_QUESTIONS = QUESTIONS_PER_SECTION * len(CATEGORIES)  # 8


# ── Lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Quiz Service",
    description="Serves open-ended quiz questions and collects user answers for AI personality profiling.",
    version="2.0.0",
    lifespan=lifespan,
)


# ── Schemas ───────────────────────────────────────────────────────────────
class QuestionOut(BaseModel):
    question_id: str
    text: str
    category: str

class AnswerIn(BaseModel):
    question_id: str
    answer_text: str

    @field_validator("answer_text")
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Answer cannot be empty.")
        return v.strip()


class AnswerOut(BaseModel):
    question_id: str
    answer_text: str


class SessionStart(BaseModel):
    user_id: str


class SessionOut(BaseModel):
    session_id: str
    user_id: str
    questions: list[QuestionOut]
    answers: dict[str, str]


# ── Helpers ───────────────────────────────────────────────────────────────
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _select_questions() -> list[dict]:
    """Randomly select 2 questions from each of the 4 categories (8 total)."""
    selected = []
    for category in CATEGORIES:
        pool = [q for q in QUESTION_BANK if q["category"] == category]
        selected.extend(random.sample(pool, QUESTIONS_PER_SECTION))
    return selected


def _get_session_or_404(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


# ── Question bank endpoint ───────────────────────────────────────────────
@app.get("/quiz/questions", tags=["Quiz"])
def get_all_questions(category: str = None):
    """Return all questions from the question bank, optionally filtered by category."""
    questions = QUESTION_BANK
    if category:
        questions = [q for q in questions if q["category"] == category]
    return questions


# ── Session endpoints ─────────────────────────────────────────────────────
@app.post("/quiz/session", response_model=SessionOut, tags=["Quiz"])
def start_session(payload: SessionStart):
    """Start a new quiz session: randomly select 8 questions (2 per category)."""
    session_id = str(uuid.uuid4())
    questions = _select_questions()

    _sessions[session_id] = {
        "user_id": payload.user_id,
        "questions": questions,
        "answers": {},
        "created_at": _now_iso(),
    }

    return SessionOut(
        session_id=session_id,
        user_id=payload.user_id,
        questions=[QuestionOut(**q) for q in questions],
        answers={},
    )


@app.get("/quiz/session/{session_id}", response_model=SessionOut, tags=["Quiz"])
def get_session(session_id: str):
    """Retrieve a session with its questions and current answers (for state restore)."""
    session = _get_session_or_404(session_id)
    return SessionOut(
        session_id=session_id,
        user_id=session["user_id"],
        questions=[QuestionOut(**q) for q in session["questions"]],
        answers=session["answers"],
    )


# ── Answer endpoints ──────────────────────────────────────────────────────
@app.post("/quiz/session/{session_id}/answer", tags=["Quiz"])
def submit_answer(session_id: str, payload: AnswerIn):
    """Submit or overwrite an answer for a question in the session."""
    session = _get_session_or_404(session_id)

    valid_qids = {q["question_id"] for q in session["questions"]}
    if payload.question_id not in valid_qids:
        raise HTTPException(status_code=400, detail=f"Question '{payload.question_id}' not in this session.")

    session["answers"][payload.question_id] = payload.answer_text
    answered_count = len(session["answers"])

    return {
        "session_id": session_id,
        "question_id": payload.question_id,
        "answered_count": answered_count,
        "total_questions": TOTAL_QUESTIONS,
        "all_answered": answered_count == TOTAL_QUESTIONS,
    }


@app.put("/quiz/session/{session_id}/answer/{question_id}", tags=["Quiz"])
def edit_answer(session_id: str, question_id: str, payload: AnswerIn):
    """Edit a previously submitted answer (triggered by the edit button in UI)."""
    session = _get_session_or_404(session_id)

    valid_qids = {q["question_id"] for q in session["questions"]}
    if question_id not in valid_qids:
        raise HTTPException(status_code=400, detail=f"Question '{question_id}' not in this session.")

    if question_id not in session["answers"]:
        raise HTTPException(status_code=400, detail=f"No existing answer for '{question_id}' to edit.")

    session["answers"][question_id] = payload.answer_text

    return {
        "session_id": session_id,
        "question_id": question_id,
        "updated": True,
        "answered_count": len(session["answers"]),
    }


@app.get("/quiz/session/{session_id}/progress", tags=["Quiz"])
def get_progress(session_id: str):
    """Check how many questions have been answered."""
    session = _get_session_or_404(session_id)
    answered_count = len(session["answers"])

    return {
        "session_id": session_id,
        "answered_count": answered_count,
        "total_questions": TOTAL_QUESTIONS,
        "all_answered": answered_count == TOTAL_QUESTIONS,
        "answered_question_ids": list(session["answers"].keys()),
    }


# ── Submit endpoint ───────────────────────────────────────────────────────
@app.post(
    "/quiz/session/{session_id}/submit",
    status_code=status.HTTP_201_CREATED,
    tags=["Quiz"],
)
async def submit_session(session_id: str):
    """
    Finalise a quiz session:
    - Validates all 8 answers are present.
    - Persists to Supabase (quiz_submissions table).
    - Returns the full Q&A payload to the caller (composite) for AI processing.
    NOTE: No longer publishes to RabbitMQ — the composite orchestrates the next step.
    """
    session = _get_session_or_404(session_id)

    if len(session["answers"]) < TOTAL_QUESTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only {len(session['answers'])}/{TOTAL_QUESTIONS} answers submitted.",
        )

    submission_id = str(uuid.uuid4())
    submitted_at = _now_iso()

    answers_list = [
        {
            "question_id": q["question_id"],
            "question_text": q["text"],
            "category": q["category"],
            "answer_text": session["answers"][q["question_id"]],
        }
        for q in session["questions"]
    ]

    record = {
        "submission_id": submission_id,
        "user_id": session["user_id"],
        "answers": answers_list,
        "submitted_at": submitted_at,
    }

    result = supabase.table("quiz_submissions").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save submission to Supabase.")

    # Clean up session from memory after successful submission
    _sessions.pop(session_id, None)

    # Return full Q&A payload so the composite can pass it to the AI atomic
    return {
        "submission_id": submission_id,
        "user_id": session["user_id"],
        "submitted_at": submitted_at,
        "answers": answers_list,
    }


# ── Submission retrieval endpoints ────────────────────────────────────────
@app.get("/quiz/submissions/{submission_id}", tags=["Quiz"])
async def get_submission(submission_id: str):
    """Retrieve a previously submitted quiz session by its submission_id."""
    result = (
        supabase.table("quiz_submissions")
        .select("*")
        .eq("submission_id", submission_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found.")

    return result.data[0]


# ── Health ────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy"}
