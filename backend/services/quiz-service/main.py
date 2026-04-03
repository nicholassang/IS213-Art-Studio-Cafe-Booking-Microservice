import asyncio
import os
import json
import uuid
import random
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import aio_pika
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client

from question_bank import QUESTION_BANK

load_dotenv()

# Supabase client
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_KEY: str = os.environ["SUPABASE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# RabbitMQ
RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
QUIZ_EXCHANGE: str = os.getenv("QUIZ_EXCHANGE", "quiz_events")

_quiz_exchange: Optional[aio_pika.abc.AbstractExchange] = None
_rabbitmq_connection = None

# ── In-memory session store ──────────────────────────────────────────────
# session_id → { "user_id", "questions": [8 selected questions], "answers": {question_id: text} }
_sessions: dict[str, dict] = {}

CATEGORIES = ["food_and_drink", "activity_preferences", "ambience_and_vibe", "visit_style_and_occasion"]
QUESTIONS_PER_SECTION = 2
TOTAL_QUESTIONS = QUESTIONS_PER_SECTION * len(CATEGORIES)  # 8


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rabbitmq_connection, _quiz_exchange

    max_retries = 10
    retry_delay = 5  # seconds

    for attempt in range(1, max_retries + 1):
        try:
            print(f"Connecting to RabbitMQ (attempt {attempt}/{max_retries})...")
            _rabbitmq_connection = await aio_pika.connect_robust(RABBITMQ_URL)
            channel = await _rabbitmq_connection.channel()
            _quiz_exchange = await channel.declare_exchange(
                QUIZ_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
            )
            print("Connected to RabbitMQ.")
            break  # success
        except Exception as exc:
            print(f"RabbitMQ unavailable (attempt {attempt}): {exc}")
            if attempt < max_retries:
                print(f"Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
            else:
                print("All RabbitMQ connection attempts failed. Async events disabled.")

    yield

    if _rabbitmq_connection and not _rabbitmq_connection.is_closed:
        await _rabbitmq_connection.close()


app = FastAPI(
    title="Quiz Service",
    description="Serves open-ended quiz questions and collects user answers for AI personality profiling.",
    version="2.0.0",
    lifespan=lifespan,
)


# ── Pydantic schemas ─────────────────────────────────────────────────────
class QuestionOut(BaseModel):
    question_id: str
    text: str
    category: str


class AnswerIn(BaseModel):
    question_id: str
    answer_text: str


class SessionStart(BaseModel):
    user_id: str


class SessionOut(BaseModel):
    session_id: str
    user_id: str
    questions: list[QuestionOut]


class AnswerUpdate(BaseModel):
    question_id: str
    answer_text: str


class QuizSubmission(BaseModel):
    user_id: str
    answers: list[AnswerIn]


class QuizSubmissionResponse(BaseModel):
    submission_id: str
    user_id: str
    submitted_at: str
    answer_count: int


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


async def _publish(routing_key: str, payload: dict) -> None:
    if _quiz_exchange is None:
        return
    try:
        await _quiz_exchange.publish(
            aio_pika.Message(
                body=json.dumps(payload).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=routing_key,
        )
    except Exception as exc:
        print(f"Failed to publish '{routing_key}': {exc}")


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

    return {
        "session_id": session_id,
        "user_id": payload.user_id,
        "questions": [QuestionOut(**q) for q in questions],
    }


@app.get("/quiz/session/{session_id}", response_model=SessionOut, tags=["Quiz"])
def get_session(session_id: str):
    """Retrieve a quiz session with its current answers."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "session_id": session_id,
        "user_id": session["user_id"],
        "questions": [QuestionOut(**q) for q in session["questions"]],
    }


# ── Answer endpoints ──────────────────────────────────────────────────────
@app.post("/quiz/session/{session_id}/answer", tags=["Quiz"])
def submit_answer(session_id: str, payload: AnswerIn):
    """Submit or update an answer for a question in the session."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

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
def edit_answer(session_id: str, question_id: str, payload: AnswerUpdate):
    """Edit a previously submitted answer."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    valid_qids = {q["question_id"] for q in session["questions"]}
    if question_id not in valid_qids:
        raise HTTPException(status_code=400, detail=f"Question '{question_id}' not in this session.")

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
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    answered_count = len(session["answers"])
    return {
        "session_id": session_id,
        "answered_count": answered_count,
        "total_questions": TOTAL_QUESTIONS,
        "all_answered": answered_count == TOTAL_QUESTIONS,
        "answered_question_ids": list(session["answers"].keys()),
    }


# ── Final submission endpoint ─────────────────────────────────────────────
@app.post(
    "/quiz/session/{session_id}/submit",
    response_model=QuizSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Quiz"],
)
async def submit_session(session_id: str):
    """
    Finalise a quiz session:
    - Validates all 8 answers are present.
    - Persists to Supabase (quiz_submissions table).
    - Publishes to RabbitMQ for AI microservice to consume.
    """
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if len(session["answers"]) < TOTAL_QUESTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only {len(session['answers'])}/{TOTAL_QUESTIONS} answers submitted.",
        )

    submission_id = str(uuid.uuid4())
    submitted_at = _now_iso()

    # Build answers list ordered by session question order
    answers_list = []
    for q in session["questions"]:
        qid = q["question_id"]
        answers_list.append({
            "question_id": qid,
            "question_text": q["text"],
            "category": q["category"],
            "answer_text": session["answers"].get(qid, ""),
        })

    record = {
        "submission_id": submission_id,
        "user_id": session["user_id"],
        "answers": answers_list,
        "submitted_at": submitted_at,
    }

    result = supabase.table("quiz_submissions").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save submission.")

    # Publish event for AI microservice
    await _publish(
        "quiz.submitted",
        {
            "submission_id": submission_id,
            "user_id": session["user_id"],
            "answers": answers_list,
            "submitted_at": submitted_at,
        },
    )

    return {
        "submission_id": submission_id,
        "user_id": session["user_id"],
        "submitted_at": submitted_at,
        "answer_count": len(answers_list),
    }


# ── Legacy compatibility endpoints (for existing frontend) ────────────────
@app.get("/quiz/questions", response_model=list[QuestionOut], tags=["Quiz"])
def get_questions(category: Optional[str] = None):
    """Return all questions (or filtered by category) for legacy frontend compatibility."""
    if category:
        return [QuestionOut(**q) for q in QUESTION_BANK if q["category"] == category]
    return [QuestionOut(**q) for q in QUESTION_BANK]


@app.get("/quiz/submissions", tags=["Quiz"])
def list_submissions(user_id: Optional[str] = None):
    query = supabase.table("quiz_submissions").select("*")
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.order("submitted_at", desc=True).execute()
    return result.data or []


@app.get("/quiz/submissions/{submission_id}", tags=["Quiz"])
def get_submission(submission_id: str):
    result = (
        supabase.table("quiz_submissions")
        .select("*")
        .eq("submission_id", submission_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No submission found.")
    return result.data[0]


@app.get("/quiz/submissions/user/{user_id}", tags=["Quiz"])
def get_user_submission(user_id: str):
    result = (
        supabase.table("quiz_submissions")
        .select("*")
        .eq("user_id", user_id)
        .order("submitted_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No submission found for this user.")
    return result.data[0]