import json
import httpx
import aio_pika
import logging
from aio_pika.abc import AbstractIncomingMessage
from contextlib import asynccontextmanager
from groq import AsyncGroq
from google import genai
from google.genai import types
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

from prompts import (
    SCORING_SYSTEM_PROMPT,
    build_profile_system_prompt,
    ACTIVITY_RECOMMENDATIONS,
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

    orchestrator_url: str = ""  # unused, but present in .env


settings = Settings()

# Supabase client (optional — only used if credentials provided)
supabase_client = None
if settings.supabase_url and settings.supabase_key:
    from supabase import create_client
    supabase_client = create_client(settings.supabase_url, settings.supabase_key)


# ---------------------------------------------------------------------------
# Pydantic models
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
# Clients
# ---------------------------------------------------------------------------
groq_client = AsyncGroq(api_key=settings.groq_api_key)
gemini_client = genai.Client(api_key=settings.gemini_api_key)

_rabbitmq_connection = None
_rabbitmq_healthy = False


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rabbitmq_connection, _rabbitmq_healthy

    try:
        logger.info(f"Connecting to RabbitMQ at {settings.rabbitmq_url}")
        _rabbitmq_connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        logger.info("Connected to RabbitMQ")

        declare_channel = await _rabbitmq_connection.channel()
        consume_channel = await _rabbitmq_connection.channel()
        await consume_channel.set_qos(prefetch_count=settings.prefetch_count)

        quiz_exchange = await declare_channel.declare_exchange(
            settings.quiz_exchange, aio_pika.ExchangeType.TOPIC, durable=True
        )
        logger.info(f"Declared exchange: {settings.quiz_exchange}")

        dlq = await declare_channel.declare_queue(
            f"{settings.quiz_queue}.dead_letter", durable=True
        )
        queue = await declare_channel.declare_queue(
            settings.quiz_queue,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": dlq.name,
            },
        )
        await queue.bind(quiz_exchange, routing_key=settings.quiz_routing_key)
        logger.info(f"Declared and bound queue: {settings.quiz_queue}")

        consume_queue = await consume_channel.declare_queue(
            settings.quiz_queue,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": dlq.name,
            },
        )
        logger.info(f"Setting up consumer on queue: {settings.quiz_queue}")
        await consume_queue.consume(on_quiz_submitted)
        logger.info("Consumer setup complete")

        _rabbitmq_healthy = True
        logger.info("RabbitMQ setup complete - healthy")

    except Exception as e:
        logger.exception(f"RabbitMQ setup failed: {e}")
        _rabbitmq_healthy = False

    yield

    if _rabbitmq_connection and not _rabbitmq_connection.is_closed:
        await _rabbitmq_connection.close()


app = FastAPI(lifespan=lifespan)


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------
def _map_scores(solo_social: int, structured_freeform: int) -> str:
    """Map axis scores to personality type."""
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


def _build_scoring_prompt(answers: list[QuizAnswer]) -> str:
    lines = ["Customer's Quiz Responses:", ""]
    for i, answer in enumerate(answers, 1):
        lines.append(f"Q{i} ({answer.category}): {answer.question_text}")
        lines.append(f"  Answer: {answer.answer_text}")
        lines.append("")
    lines.append("Score this customer on the Solo↔Social and Structured↔Freeform axes.")
    return "\n".join(lines)


def _build_profile_prompt(answers: list[QuizAnswer], scores: ScoringResult, personality_type: str, recommendations: list[str]) -> str:
    lines = [
        f"Customer's Quiz Responses:",
        "",
    ]
    for i, answer in enumerate(answers, 1):
        lines.append(f"Q{i} ({answer.category}): {answer.question_text}")
        lines.append(f"  Answer: {answer.answer_text}")
        lines.append("")

    lines += [
        f"Personality Type: {personality_type}",
        f"Solo↔Social Score: {scores.solo_social_score}/10",
        f"Structured↔Freeform Score: {scores.structured_freeform_score}/10",
        f"Scoring Reasoning: {scores.reasoning}",
        "",
        f"Top 3 Recommended Activities:",
        f"1. {recommendations[0]}",
        f"2. {recommendations[1]}",
        f"3. {recommendations[2]}",
        "",
        "Write a personalised profile for this customer.",
    ]
    return "\n".join(lines)


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
    """Call Groq first, fallback to Gemini."""
    try:
        return await _call_groq(system_prompt, user_prompt, temperature)
    except Exception as e:
        logger.warning(f"Groq failed, falling back to Gemini: {e}")
        try:
            return await _call_gemini(system_prompt, user_prompt, temperature)
        except Exception as e:
            logger.error(f"Both AI providers failed: {e}")
            raise


def _parse_json_response(text: str) -> dict:
    """Extract JSON from AI response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[-2] if text.count("```") >= 2 else text.split("```", 1)[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


# ── Call 1: Scoring (temperature: 0) ─────────────────────────────────────
async def score_answers(answers: list[QuizAnswer]) -> ScoringResult:
    user_prompt = _build_scoring_prompt(answers)
    response_text = await _call_ai(SCORING_SYSTEM_PROMPT, user_prompt, temperature=0)
    data = _parse_json_response(response_text)
    return ScoringResult(**data)


# ── Call 2: Profile write-up (temperature: 0.7) ──────────────────────────
async def generate_profile(
    answers: list[QuizAnswer],
    scores: ScoringResult,
    personality_type: str,
    recommendations: list[str],
) -> ProfileResult:
    system_prompt = build_profile_system_prompt(personality_type, scores.model_dump(), recommendations)
    user_prompt = _build_profile_prompt(answers, scores, personality_type, recommendations)
    response_text = await _call_ai(system_prompt, user_prompt, temperature=0.7)
    data = _parse_json_response(response_text)
    return ProfileResult(**data)


# ── Store in Supabase ─────────────────────────────────────────────────────
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
    }

    try:
        supabase_client.table("quiz_results").insert(record).execute()
        logger.info(f"Stored result in Supabase for submission {submission_id}")
    except Exception as e:
        logger.error(f"Failed to store result in Supabase: {e}")


# ---------------------------------------------------------------------------
# RabbitMQ consumer
# ---------------------------------------------------------------------------
async def on_quiz_submitted(message: AbstractIncomingMessage) -> None:
    try:
        event = QuizSubmittedEvent(**json.loads(message.body.decode()))
        logger.info(f"Processing quiz submission {event.submission_id} for user {event.user_id}")

        # Call 1 — Scoring (temperature: 0)
        scores = await score_answers(event.answers)
        personality_type = _map_scores(scores.solo_social_score, scores.structured_freeform_score)
        recommendations = ACTIVITY_RECOMMENDATIONS[personality_type]
        logger.info(f"Scores: Solo↔Social={scores.solo_social_score}, Structured↔Freeform={scores.structured_freeform} → {personality_type}")

        # Call 2 — Profile write-up (temperature: 0.7)
        profile = await generate_profile(event.answers, scores, personality_type, recommendations)
        logger.info(f"Profile generated: {profile.profile_title}")

        # Store in Supabase
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
        logger.info(f"Successfully processed submission {event.submission_id}")

    except Exception:
        logger.exception("Failed to process quiz submission")
        await message.nack(requeue=False)


# ---------------------------------------------------------------------------
# Fetch stored quiz results
# ---------------------------------------------------------------------------
@app.get("/quiz/results/{submission_id}")
async def get_quiz_results(submission_id: str):
    """Fetch AI-generated quiz results for a given submission_id."""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        result = supabase_client.table("quiz_results").select("*").eq("submission_id", submission_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Results not found or still processing")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch results for {submission_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
async def health_check():
    issues = []
    if not settings.groq_api_key:
        issues.append("GROQ_API_KEY is missing")
    if not settings.gemini_api_key:
        issues.append("GEMINI_API_KEY is missing")
    if not _rabbitmq_healthy:
        issues.append("RabbitMQ is unavailable")
    if issues:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "issues": issues})
    return {"status": "healthy"}
