import json
import logging
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import aio_pika
import httpx
from aio_pika.abc import AbstractIncomingMessage
from fastapi import FastAPI, HTTPException
from groq import AsyncGroq
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from prompts import (
    SCORING_SYSTEM_PROMPT,
    build_profile_system_prompt,
    AVAILABLE_ACTIVITIES,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    groq_api_key: str
    groq_model: str = "llama-3.1-8b-instant"

    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash"

    supabase_url: str = ""
    supabase_key: str = ""

    rabbitmq_url: str = "amqp://guest:guest@localhost/"
    quiz_exchange: str = "quiz_events"
    quiz_queue: str = "ai_recommendation_queue"
    quiz_routing_key: str = "quiz.submitted"
    prefetch_count: int = 10


settings = Settings()

supabase_client = None
if settings.supabase_url and settings.supabase_key:
    from supabase import create_client
    supabase_client = create_client(settings.supabase_url, settings.supabase_key)

groq_client = AsyncGroq(api_key=settings.groq_api_key)
gemini_client = None
if settings.gemini_api_key:
    gemini_client = genai.Client(api_key=settings.gemini_api_key)

_rabbitmq_connection = None
# Fix #3: replaced simple bool with a proper connection-state check helper
# so health reflects live connection state, not just startup success.

# Fix #2: module-level shared HTTP client, cleaned up in lifespan shutdown.
_service_client: Optional[httpx.AsyncClient] = None


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class QuizAnswer(BaseModel):
    question_id: str
    question_text: str
    category: str
    answer_text: str


class QuizSubmittedEvent(BaseModel):
    submission_id: str
    user_id: str
    answers: list[QuizAnswer] = Field(..., min_length=1)
    submitted_at: Optional[str] = None


class ScoringResult(BaseModel):
    solo_social_score: int = Field(..., ge=0, le=10)
    structured_freeform_score: int = Field(..., ge=0, le=10)
    reasoning: str


class ProfileResult(BaseModel):
    profile_title: str
    profile_body: str
    activity_explanations: list[dict]
    closing: str


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rabbitmq_connection, _service_client

    # Fix #2: initialise the shared HTTP client here so it is always closed on shutdown.
    _service_client = httpx.AsyncClient(timeout=10.0)

    try:
        _rabbitmq_connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        logger.info("Connected to RabbitMQ")

        declare_channel = await _rabbitmq_connection.channel()
        consume_channel = await _rabbitmq_connection.channel()
        await consume_channel.set_qos(prefetch_count=settings.prefetch_count)

        quiz_exchange = await declare_channel.declare_exchange(
            settings.quiz_exchange, aio_pika.ExchangeType.TOPIC, durable=True
        )

        dlq_name = f"{settings.quiz_queue}.dead_letter"
        # Fix #5: DLQ is now explicitly bound to the default exchange via its
        # queue name so messages routed there are always deliverable.
        await declare_channel.declare_queue(dlq_name, durable=True)

        queue_args = {
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": dlq_name,
        }

        await declare_channel.declare_queue(
            settings.quiz_queue, durable=True, arguments=queue_args
        )

        consume_queue = await consume_channel.declare_queue(
            settings.quiz_queue, durable=True, arguments=queue_args
        )
        await consume_queue.bind(quiz_exchange, routing_key=settings.quiz_routing_key)
        await consume_queue.consume(on_quiz_submitted)

        logger.info("RabbitMQ setup complete")

    except Exception as e:
        logger.exception(f"RabbitMQ setup failed: {e}")

    yield

    # Fix #2: always close the shared HTTP client on shutdown.
    if _service_client:
        await _service_client.aclose()

    if _rabbitmq_connection and not _rabbitmq_connection.is_closed:
        await _rabbitmq_connection.close()


app = FastAPI(lifespan=lifespan)


# ---------------------------------------------------------------------------
# Connection health helper
# ---------------------------------------------------------------------------
def _rabbitmq_is_healthy() -> bool:
    """
    Fix #3: derive liveness from the actual connection object rather than a
    stale boolean flag that is never updated after initial startup.
    """
    return (
        _rabbitmq_connection is not None
        and not _rabbitmq_connection.is_closed
    )


# ---------------------------------------------------------------------------
# AI helpers
# ---------------------------------------------------------------------------
async def _call_groq(system_prompt: str, user_prompt: str, temperature: float) -> str:
    completion = await groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        model=settings.groq_model,
        temperature=temperature,
    )
    return completion.choices[0].message.content.strip()


async def _call_gemini(system_prompt: str, user_prompt: str, temperature: float) -> str:
    response = await gemini_client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
        ),
    )
    return response.text.strip()


async def _call_ai(system_prompt: str, user_prompt: str, temperature: float) -> str:
    """Call Groq first, fallback to Gemini if available."""
    try:
        return await _call_groq(system_prompt, user_prompt, temperature)
    except Exception as e:
        if not gemini_client:
            logger.error(f"Groq failed and Gemini not configured: {e}")
            raise
        logger.warning(f"Groq failed, falling back to Gemini: {e}")
        return await _call_gemini(system_prompt, user_prompt, temperature)


def _parse_json_response(text: str) -> dict:
    """
    Fix #7: robustly extract the first JSON object from an AI response,
    handling markdown fences, leading/trailing prose, and nested braces.
    """
    text = text.strip()
    # Try to find a JSON object anywhere in the response.
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in AI response: {text!r}")
    return json.loads(match.group())


def _map_scores(solo_social: int, structured_freeform: int) -> str:
    """Map axis scores to personality type. AI never sees type names in Call 1."""
    social = solo_social >= 5
    freeform = structured_freeform >= 5

    if social and not freeform:
        return "Workshop Goer"
    elif social and freeform:
        return "Free Spirit"
    elif not social and not freeform:
        return "Craftsman"
    else:
        return "Dreamer"


def _format_answers(answers: list[QuizAnswer]) -> str:
    lines = []
    for i, a in enumerate(answers, 1):
        lines.append(f"Q{i} ({a.category}): {a.question_text}")
        lines.append(f"  Answer: {a.answer_text}")
        lines.append("")
    return "\n".join(lines)


def _extract_recommendations(profile: ProfileResult) -> list[str]:
    """Extract ranked activity names from profile activity_explanations."""
    return [
        item["activity"]
        for item in sorted(profile.activity_explanations, key=lambda x: x["rank"])
    ]


# ---------------------------------------------------------------------------
# Call 1 — Scoring (temperature: 0)
# ---------------------------------------------------------------------------
async def score_answers(answers: list[QuizAnswer]) -> ScoringResult:
    user_prompt = (
        "Customer's Quiz Responses:\n\n"
        + _format_answers(answers)
        + "Score this customer on the Solo↔Social and Structured↔Freeform axes."
    )
    response_text = await _call_ai(SCORING_SYSTEM_PROMPT, user_prompt, temperature=0)
    return ScoringResult(**_parse_json_response(response_text))


# ---------------------------------------------------------------------------
# Call 2 — Profile write-up (temperature: 0.7)
# ---------------------------------------------------------------------------
async def generate_profile(
    answers: list[QuizAnswer],
    scores: ScoringResult,
    personality_type: str,
    # Fix #6: mutable default replaced with None to avoid the shared-list gotcha.
    disliked_activities: Optional[list[str]] = None,
) -> ProfileResult:
    if disliked_activities is None:
        disliked_activities = []

    user_prompt = (
        "Customer's Quiz Responses:\n\n"
        + _format_answers(answers)
        + f"Personality Type: {personality_type}\n"
        + f"Solo↔Social Score: {scores.solo_social_score}/10\n"
        + f"Structured↔Freeform Score: {scores.structured_freeform_score}/10\n"
        + f"Scoring Reasoning: {scores.reasoning}\n\n"
        + "Write a personalised profile for this customer."
    )
    system_prompt = build_profile_system_prompt(
        personality_type,
        scores.model_dump(),
        disliked_activities,
    )
    response_text = await _call_ai(system_prompt, user_prompt, temperature=0.7)
    return ProfileResult(**_parse_json_response(response_text))


# ---------------------------------------------------------------------------
# Supabase storage
# ---------------------------------------------------------------------------
async def store_result(
    submission_id: str,
    user_id: str,
    answers: list[QuizAnswer],
    scores: ScoringResult,
    personality_type: str,
    recommendations: list[str],
    profile: ProfileResult,
) -> None:
    if not supabase_client:
        logger.warning("Supabase not configured — skipping storage")
        return

    # Fix #10: confidence formula documented inline.
    # Deviation from the midpoint (5) on each axis, normalised to [0, 1].
    # A score of 0 or 10 → deviation 1.0 (very confident).
    # A score of 5     → deviation 0.0 (ambiguous, lowest confidence).
    # Base confidence of 0.60 ensures even ambiguous results are plausible.
    # The 0.35 weight means a perfectly decisive result reaches 0.60 + 0.35 = 0.95.
    solo_deviation = abs(scores.solo_social_score - 5) / 5.0
    structured_deviation = abs(scores.structured_freeform_score - 5) / 5.0
    confidence = round(0.60 + ((solo_deviation + structured_deviation) / 2) * 0.35, 2)

    record = {
        "submission_id": submission_id,
        "user_id": user_id,
        "answers": [a.model_dump() for a in answers],
        "solo_social_score": scores.solo_social_score,
        "structured_freeform_score": scores.structured_freeform_score,
        "scoring_reasoning": scores.reasoning,
        "personality_type": personality_type,
        "recommendations": recommendations,
        "profile_title": profile.profile_title,
        "profile_body": profile.profile_body,
        "activity_explanations": profile.activity_explanations,
        "closing": profile.closing,
        "confidence_score": confidence,
    }

    try:
        result = supabase_client.table("quiz_results").insert(record).execute()
        if result.data:
            logger.info(f"Stored result for {submission_id} (confidence: {confidence})")
        else:
            logger.warning(
                f"Supabase returned empty for {submission_id} — some columns may be missing"
            )
    except Exception as e:
        error_msg = str(e).lower()
        if any(kw in error_msg for kw in ("column", "schema", "constraint", "violat", "400")):
            try:
                minimal_record = {
                    "submission_id": submission_id,
                    "user_id": user_id,
                    "answers": [a.model_dump() for a in answers],
                    "solo_social_score": scores.solo_social_score,
                    "structured_freeform_score": scores.structured_freeform_score,
                    "personality_type": personality_type,
                    "recommendations": recommendations,
                }
                supabase_client.table("quiz_results").insert(minimal_record).execute()
                logger.info(
                    f"Stored minimal result for {submission_id} (some columns unavailable)"
                )
            except Exception as e2:
                logger.error(f"Failed to store even minimal result for {submission_id}: {e2}")
        else:
            logger.error(f"Failed to store result for {submission_id}: {e}")


# ---------------------------------------------------------------------------
# RabbitMQ consumer
# ---------------------------------------------------------------------------
async def on_quiz_submitted(message: AbstractIncomingMessage) -> None:
    """
    Fix #8: messages that raise an unexpected exception are nacked immediately
    (requeue=False) and routed to the DLQ — there is no silent infinite retry.
    Transient errors should be handled inside score_answers / generate_profile
    with their own retry logic if needed.
    """
    try:
        event = QuizSubmittedEvent(**json.loads(message.body.decode()))
        logger.info(f"Processing submission {event.submission_id} for user {event.user_id}")

        scores = await score_answers(event.answers)
        personality_type = _map_scores(scores.solo_social_score, scores.structured_freeform_score)
        logger.info(
            f"Scored: Solo↔Social={scores.solo_social_score}, "
            f"Structured↔Freeform={scores.structured_freeform_score} → {personality_type}"
        )

        disliked: list[str] = []  # populate from event.answers when dislike question is added

        profile = await generate_profile(event.answers, scores, personality_type, disliked)
        recommendations = _extract_recommendations(profile)
        logger.info(f"Profile generated: {profile.profile_title} | Activities: {recommendations}")

        await store_result(
            event.submission_id,
            event.user_id,
            event.answers,
            scores,
            personality_type,
            recommendations,
            profile,
        )

        await message.ack()
        logger.info(f"Done: {event.submission_id}")

    except Exception:
        logger.exception("Failed to process quiz submission")
        await message.nack(requeue=False)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

QUIZ_COMPOSITE_URL = "http://ai-recommender-composite-service:8000"


async def _get_service_client() -> httpx.AsyncClient:
    """
    Fix #2 & #9: return the module-level client that is guaranteed to exist
    after lifespan startup. No more fragile is_closed check.
    """
    if _service_client is None:
        raise RuntimeError("HTTP client not initialised — lifespan may not have run")
    return _service_client


class RecommendSubmitRequest(BaseModel):
    user_id: str
    answers: list[dict] = Field(..., min_length=1)


@app.post("/recommend/submit")
async def recommend_submit(request: RecommendSubmitRequest):
    """
    Receive quiz answers, create a submission in Supabase,
    publish to RabbitMQ for async AI processing, return submission_id immediately.

    Fix #4: Supabase write is fully confirmed before we publish to RabbitMQ,
    so a storage failure never results in a queued event with no backing record.
    """
    submission_id = str(uuid.uuid4())
    submitted_at = datetime.now(timezone.utc).isoformat()

    # Step 1: Fetch questions from composite service
    try:
        client = await _get_service_client()
        q_res = await client.get(f"{QUIZ_COMPOSITE_URL}/quiz/questions")
        if q_res.status_code != 200:
            logger.error(f"Failed to fetch questions: {q_res.status_code}")
            raise HTTPException(status_code=502, detail="Failed to fetch questions")
        all_questions = q_res.json()

        question_map = {q["question_id"]: q for q in all_questions}
        option_map = {
            q["question_id"]: {
                opt["option_id"]: opt.get("text", opt.get("option_text", ""))
                for opt in q.get("options", [])
            }
            for q in all_questions
        }

        answers_list = []
        for ans in request.answers:
            qid = ans["question_id"]
            option_id = ans.get("option_id", ans.get("selected_option_id", ""))
            q_data = question_map.get(qid, {})
            answer_text = option_map.get(qid, {}).get(option_id, option_id)

            answers_list.append({
                "question_id": qid,
                "question_text": q_data.get("text", q_data.get("question_text", "")),
                "category": q_data.get("category", ""),
                "answer_text": answer_text,
            })

        logger.info(f"Fetched {len(all_questions)} questions, building {len(answers_list)} answers")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching questions: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch questions: {str(e)}")

    # Step 2: Store submission in Supabase (must succeed before we publish)
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    try:
        record = {
            "submission_id": submission_id,
            "user_id": request.user_id,
            "answers": answers_list,
            "submitted_at": submitted_at,
        }
        result = supabase_client.table("quiz_submissions").insert(record).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save submission")
        logger.info(f"Stored submission in Supabase: {submission_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to store submission in Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store submission: {str(e)}")

    # Step 3: Publish to RabbitMQ
    # Fix #1: use async context manager so the channel is always closed,
    # even if publish raises — prevents connection handle exhaustion under load.
    try:
        if not _rabbitmq_is_healthy():
            raise HTTPException(status_code=503, detail="AI recommendation service is unavailable")

        async with _rabbitmq_connection.channel() as channel:
            exchange = await channel.declare_exchange(
                settings.quiz_exchange, aio_pika.ExchangeType.TOPIC, durable=True
            )

            event_payload = {
                "submission_id": submission_id,
                "user_id": request.user_id,
                "answers": answers_list,
                "submitted_at": submitted_at,
            }

            message = aio_pika.Message(
                body=json.dumps(event_payload).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            )
            await exchange.publish(message, routing_key=settings.quiz_routing_key)
            logger.info(f"Published quiz event to RabbitMQ: submission_id={submission_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to publish to RabbitMQ: {e}")
        raise HTTPException(status_code=503, detail="Failed to queue for AI processing")

    return {"submission_id": submission_id, "status": "processing"}


class RecommendPreviewRequest(BaseModel):
    user_id: str
    answers: list[dict] = Field(..., min_length=1)


@app.post("/recommend/preview")
async def recommend_preview(request: RecommendPreviewRequest):
    """
    Generate a recommendation synchronously (for preview/testing).
    Blocks until AI processing is complete.
    """
    submission_id = str(uuid.uuid4())

    quiz_answers = [
        QuizAnswer(
            question_id=ans["question_id"],
            question_text=ans.get("question_text", ""),
            category=ans.get("category", ""),
            answer_text=ans.get("option_text", ans.get("answer_text", "")),
        )
        for ans in request.answers
    ]

    try:
        scores = await score_answers(quiz_answers)
        personality_type = _map_scores(scores.solo_social_score, scores.structured_freeform_score)
        profile = await generate_profile(quiz_answers, scores, personality_type)
        recommendations = _extract_recommendations(profile)

        return {
            "submission_id": submission_id,
            "personality_type": personality_type,
            "solo_social_score": scores.solo_social_score,
            "structured_freeform_score": scores.structured_freeform_score,
            "profile_title": profile.profile_title,
            "profile_body": profile.profile_body,
            "recommendations": recommendations,
            "activity_explanations": profile.activity_explanations,
            "closing": profile.closing,
        }
    except Exception as e:
        logger.error(f"Failed to generate preview: {e}")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")


@app.get("/quiz/results/{submission_id}")
async def get_quiz_results(submission_id: str):
    """Fetch AI-generated results for a submission."""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        result = (
            supabase_client.table("quiz_results")
            .select("*")
            .eq("submission_id", submission_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Results not found or still processing")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch results for {submission_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    issues = []
    if not settings.groq_api_key:
        issues.append("GROQ_API_KEY missing")
    if not gemini_client:
        issues.append("GEMINI_API_KEY missing (optional - Groq fallback only)")
    if not _rabbitmq_is_healthy():
        issues.append("RabbitMQ unavailable")
    if issues:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "issues": issues})
    return {"status": "healthy"}
