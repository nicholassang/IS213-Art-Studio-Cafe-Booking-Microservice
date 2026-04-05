import uuid
import random
import os
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, field_validator

from question_bank import QUESTION_BANK

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Supabase setup ──────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase credentials not configured — quiz service requires Supabase")

CATEGORIES = ["food_and_drink", "activity_preferences", "ambience_and_vibe", "visit_style_and_occasion"]
QUESTIONS_PER_SECTION = 2
TOTAL_QUESTIONS = QUESTIONS_PER_SECTION * len(CATEGORIES)  # 8

app = FastAPI(
    title="Quiz Service",
    description="Serves open-ended quiz questions and collects user answers for AI personality profiling.",
    version="3.0.0",
)

# ── Schemas ───────────────────────────────────────────────────────────────
class AnswerIn(BaseModel):
    question_id: str
    answer_text: str

    @field_validator("answer_text")
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Answer cannot be empty.")
        return v.strip()


class SessionStart(BaseModel):
    user_id: str


class SessionOut(BaseModel):
    session_id: str
    user_id: str
    questions: list[dict]
    answers: dict[str, str]


# ── Helpers ───────────────────────────────────────────────────────────────
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_supabase():
    """Raise 503 if Supabase is not configured."""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")


async def _save_answers(session_id: str, answers: dict[str, str]) -> None:
    """Persist answers to Supabase with timestamp."""
    try:
        supabase_client.table("quiz_sessions").update({
            "answers": answers,
            "updated_at": _now_iso(),
        }).eq("session_id", session_id).execute()
    except Exception as e:
        logger.error(f"Failed to save answers: {e}")
        raise HTTPException(status_code=500, detail="Failed to save answer.")


def _select_questions() -> list[dict]:
    """Randomly select 2 questions from each of the 4 categories (8 total)."""
    selected = []
    for category in CATEGORIES:
        pool = [q for q in QUESTION_BANK if q["category"] == category]
        selected.extend(random.sample(pool, QUESTIONS_PER_SECTION))
    return selected


def _session_from_db(row: dict) -> dict:
    """Normalize a Supabase row into a session dict."""
    return {
        "user_id": row["user_id"],
        "questions": row["questions"],
        "answers": row.get("answers") or {},
    }


async def _get_session_or_404(session_id: str) -> dict:
    """Fetch session directly from Supabase."""
    _require_supabase()
    try:
        result = (
            supabase_client.table("quiz_sessions")
            .select("*")
            .eq("session_id", session_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Session not found.")
        return _session_from_db(result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch session.")


# ── Question bank endpoint ───────────────────────────────────────────────
@app.get("/quiz/questions", tags=["Quiz"])
def get_all_questions(category: str | None = None):
    """Return all questions from the question bank, optionally filtered by category."""
    questions = QUESTION_BANK
    if category:
        questions = [q for q in questions if q["category"] == category]
    return questions


# ── Session endpoints ─────────────────────────────────────────────────────
@app.post("/quiz/session", response_model=SessionOut, tags=["Quiz"])
async def start_session(payload: SessionStart):
    """Start a new quiz session: randomly select 8 questions (2 per category)."""
    _require_supabase()

    session_id = str(uuid.uuid4())
    questions = _select_questions()

    record = {
        "session_id": session_id,
        "user_id": payload.user_id,
        "questions": questions,
        "answers": {},
        "status": "active",
        "created_at": _now_iso(),
    }

    try:
        supabase_client.table("quiz_sessions").insert(record).execute()
        logger.info(f"Session {session_id} created for user {payload.user_id}")
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session.")

    return SessionOut(
        session_id=session_id,
        user_id=payload.user_id,
        questions=questions,
        answers={},
    )


@app.get("/quiz/session/{session_id}", response_model=SessionOut, tags=["Quiz"])
async def get_session(session_id: str):
    """Retrieve a session with its questions and current answers (for state restore)."""
    session = await _get_session_or_404(session_id)
    return SessionOut(
        session_id=session_id,
        user_id=session["user_id"],
        questions=session["questions"],
        answers=session["answers"],
    )


# ── Answer endpoints ──────────────────────────────────────────────────────
@app.post("/quiz/session/{session_id}/answer", tags=["Quiz"])
async def submit_answer(session_id: str, payload: AnswerIn):
    """Submit or overwrite an answer for a question in the session."""
    session = await _get_session_or_404(session_id)

    valid_qids = {q["question_id"] for q in session["questions"]}
    if payload.question_id not in valid_qids:
        raise HTTPException(status_code=400, detail=f"Question '{payload.question_id}' not in this session.")

    session["answers"][payload.question_id] = payload.answer_text
    await _save_answers(session_id, session["answers"])
    answered_count = len(session["answers"])

    return {
        "session_id": session_id,
        "question_id": payload.question_id,
        "answered_count": answered_count,
        "total_questions": TOTAL_QUESTIONS,
        "all_answered": answered_count == TOTAL_QUESTIONS,
    }


@app.put("/quiz/session/{session_id}/answer/{question_id}", tags=["Quiz"])
async def edit_answer(session_id: str, question_id: str, payload: AnswerIn):
    """Edit a previously submitted answer (triggered by the edit button in UI)."""
    session = await _get_session_or_404(session_id)

    valid_qids = {q["question_id"] for q in session["questions"]}
    if question_id not in valid_qids:
        raise HTTPException(status_code=400, detail=f"Question '{question_id}' not in this session.")

    if question_id not in session["answers"]:
        raise HTTPException(status_code=400, detail=f"No existing answer for '{question_id}' to edit.")

    session["answers"][question_id] = payload.answer_text
    await _save_answers(session_id, session["answers"])

    return {
        "session_id": session_id,
        "question_id": question_id,
        "updated": True,
        "answered_count": len(session["answers"]),
    }


@app.get("/quiz/session/{session_id}/progress", tags=["Quiz"])
async def get_progress(session_id: str):
    """Check how many questions have been answered."""
    session = await _get_session_or_404(session_id)
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
    - Marks session as completed in Supabase.
    - Returns the full Q&A payload to the caller (composite) for AI processing.
    NOTE: Storage is handled by the AI recommendation service (quiz_results table).
    """
    session = await _get_session_or_404(session_id)

    if len(session["answers"]) < TOTAL_QUESTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only {len(session['answers'])}/{TOTAL_QUESTIONS} answers submitted.",
        )

    try:
        supabase_client.table("quiz_sessions").delete().eq("session_id", session_id).execute()
        logger.info(f"Session {session_id} deleted after submission")
    except Exception as e:
        logger.error(f"Failed to delete session after submit: {e}")

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

    # Return full Q&A payload so the composite can pass it to the AI atomic
    return {
        "submission_id": submission_id,
        "user_id": session["user_id"],
        "submitted_at": submitted_at,
        "answers": answers_list,
    }


# ── Health ────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    db_ok = supabase_client is not None
    if not db_ok:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "issues": ["Supabase not configured"]})
    return {"status": "healthy", "supabase": "connected"}
