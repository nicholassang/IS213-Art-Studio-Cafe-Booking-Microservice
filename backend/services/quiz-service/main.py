import logging
import os
import random
import uuid
from importlib import import_module
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, field_validator
from psycopg import connect
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from question_bank import QUESTION_BANK

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

storage_backend = None
supabase_client = None

if DATABASE_URL:
    storage_backend = "postgres"
    logger.info("Quiz service configured to use Postgres session storage")
elif SUPABASE_URL and SUPABASE_KEY:
    try:
        create_client = import_module("supabase").create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        storage_backend = "supabase"
        logger.info("Quiz service configured to use Supabase session storage")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Quiz session storage not configured — set DATABASE_URL or Supabase credentials")

CATEGORIES = ["food_and_drink", "activity_preferences", "ambience_and_vibe", "visit_style_and_occasion"]
QUESTIONS_PER_SECTION = 2
TOTAL_QUESTIONS = QUESTIONS_PER_SECTION * len(CATEGORIES)

app = FastAPI(
    title="Quiz Service",
    description="Serves open-ended quiz questions and collects user answers for AI personality profiling.",
    version="3.0.0",
)


class AnswerIn(BaseModel):
    question_id: str
    answer_text: str

    @field_validator("answer_text")
    @classmethod
    def answer_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Answer cannot be empty.")
        return value.strip()


class SessionStart(BaseModel):
    user_id: str


class SessionOut(BaseModel):
    session_id: str
    user_id: str
    questions: list[dict]
    answers: dict[str, str]


def _connect_db():
    return connect(DATABASE_URL, row_factory=dict_row)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_postgres_schema() -> None:
    if storage_backend != "postgres":
        return

    with _connect_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS quiz_sessions (
                    session_id text PRIMARY KEY,
                    user_id text NOT NULL,
                    questions jsonb NOT NULL,
                    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
                    status text NOT NULL DEFAULT 'active',
                    created_at timestamptz NOT NULL,
                    updated_at timestamptz
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id
                ON quiz_sessions (user_id)
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status
                ON quiz_sessions (status)
                """
            )
        conn.commit()


def _require_storage() -> None:
    if storage_backend == "postgres":
        return
    if storage_backend == "supabase" and supabase_client is not None:
        return
    raise HTTPException(status_code=503, detail="Quiz session storage not configured")


def _select_questions() -> list[dict]:
    selected = []
    for category in CATEGORIES:
        pool = [question for question in QUESTION_BANK if question["category"] == category]
        selected.extend(random.sample(pool, QUESTIONS_PER_SECTION))
    return selected


def _session_from_row(row: dict) -> dict:
    return {
        "user_id": row["user_id"],
        "questions": row["questions"],
        "answers": row.get("answers") or {},
    }


async def _save_answers(session_id: str, answers: dict[str, str]) -> None:
    try:
        if storage_backend == "postgres":
            with _connect_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE quiz_sessions
                        SET answers = %s, updated_at = %s
                        WHERE session_id = %s
                        """,
                        (Jsonb(answers), datetime.now(timezone.utc), session_id),
                    )
                conn.commit()
            return

        supabase_client.table("quiz_sessions").update({
            "answers": answers,
            "updated_at": _now_iso(),
        }).eq("session_id", session_id).execute()
    except Exception as e:
        logger.error(f"Failed to save answers: {e}")
        raise HTTPException(status_code=500, detail="Failed to save answer.")


async def _get_session_or_404(session_id: str) -> dict:
    _require_storage()

    try:
        if storage_backend == "postgres":
            with _connect_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT session_id, user_id, questions, answers
                        FROM quiz_sessions
                        WHERE session_id = %s
                        LIMIT 1
                        """,
                        (session_id,),
                    )
                    row = cur.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Session not found.")

            return _session_from_row(row)

        result = (
            supabase_client.table("quiz_sessions")
            .select("*")
            .eq("session_id", session_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Session not found.")
        return _session_from_row(result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch session.")


@app.on_event("startup")
async def startup_event():
    if storage_backend == "postgres":
        try:
            _ensure_postgres_schema()
        except Exception as e:
            logger.error(f"Failed to initialize Postgres schema: {e}")
            raise


@app.get("/quiz/questions", tags=["Quiz"])
def get_all_questions(category: str | None = None):
    questions = QUESTION_BANK
    if category:
        questions = [question for question in questions if question["category"] == category]
    return questions


@app.post("/quiz/session", response_model=SessionOut, tags=["Quiz"])
async def start_session(payload: SessionStart):
    _require_storage()

    session_id = str(uuid.uuid4())
    questions = _select_questions()
    created_at = datetime.now(timezone.utc)

    try:
        if storage_backend == "postgres":
            with _connect_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO quiz_sessions (
                            session_id,
                            user_id,
                            questions,
                            answers,
                            status,
                            created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            session_id,
                            payload.user_id,
                            Jsonb(questions),
                            Jsonb({}),
                            "active",
                            created_at,
                        ),
                    )
                conn.commit()
        else:
            supabase_client.table("quiz_sessions").insert({
                "session_id": session_id,
                "user_id": payload.user_id,
                "questions": questions,
                "answers": {},
                "status": "active",
                "created_at": created_at.isoformat(),
            }).execute()

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
    session = await _get_session_or_404(session_id)
    return SessionOut(
        session_id=session_id,
        user_id=session["user_id"],
        questions=session["questions"],
        answers=session["answers"],
    )


@app.post("/quiz/session/{session_id}/answer", tags=["Quiz"])
async def submit_answer(session_id: str, payload: AnswerIn):
    session = await _get_session_or_404(session_id)

    valid_qids = {question["question_id"] for question in session["questions"]}
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
    session = await _get_session_or_404(session_id)

    valid_qids = {question["question_id"] for question in session["questions"]}
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
    session = await _get_session_or_404(session_id)
    answered_count = len(session["answers"])

    return {
        "session_id": session_id,
        "answered_count": answered_count,
        "total_questions": TOTAL_QUESTIONS,
        "all_answered": answered_count == TOTAL_QUESTIONS,
        "answered_question_ids": list(session["answers"].keys()),
    }


@app.post(
    "/quiz/session/{session_id}/submit",
    status_code=status.HTTP_201_CREATED,
    tags=["Quiz"],
)
async def submit_session(session_id: str):
    session = await _get_session_or_404(session_id)

    if len(session["answers"]) < TOTAL_QUESTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only {len(session['answers'])}/{TOTAL_QUESTIONS} answers submitted.",
        )

    try:
        if storage_backend == "postgres":
            with _connect_db() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM quiz_sessions WHERE session_id = %s", (session_id,))
                conn.commit()
        else:
            supabase_client.table("quiz_sessions").delete().eq("session_id", session_id).execute()
        logger.info(f"Session {session_id} deleted after submission")
    except Exception as e:
        logger.error(f"Failed to delete session after submit: {e}")

    answers_list = [
        {
            "question_id": question["question_id"],
            "question_text": question["text"],
            "category": question["category"],
            "answer_text": session["answers"][question["question_id"]],
        }
        for question in session["questions"]
    ]

    return {
        "submission_id": str(uuid.uuid4()),
        "user_id": session["user_id"],
        "submitted_at": _now_iso(),
        "answers": answers_list,
    }


@app.get("/health")
async def health():
    if storage_backend == "postgres":
        try:
            with _connect_db() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
            return {"status": "healthy", "storage": "postgres"}
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail={"status": "unhealthy", "issues": [f"Postgres unavailable: {e}"]},
            )

    if storage_backend == "supabase" and supabase_client is not None:
        return {"status": "healthy", "storage": "supabase"}

    raise HTTPException(
        status_code=503,
        detail={"status": "unhealthy", "issues": ["Quiz session storage not configured"]},
    )
