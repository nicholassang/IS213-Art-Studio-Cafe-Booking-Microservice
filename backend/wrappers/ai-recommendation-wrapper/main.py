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

from prompts import QUIZ_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    groq_api_key: str
    groq_model: str = "llama-3.1-8b-instant"

    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash"

    rabbitmq_url: str = "amqp://guest:guest@localhost/"
    quiz_exchange: str = "quiz_events"
    quiz_queue: str = "ai_recommendation_queue"
    quiz_routing_key: str = "quiz.submitted"
    prefetch_count: int = 10

    orchestrator_url: str = "http://orchestrator-service/api/recommendations"


settings = Settings()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class QuizAnswer(BaseModel):
    question_id: str
    selected_option_id: str
    question_text: Optional[str] = None
    option_text: Optional[str] = None

class QuizSubmittedEvent(BaseModel):
    submission_id: str
    user_id: str
    answers: list[QuizAnswer] = Field(..., min_length=1)
    submitted_at: Optional[str] = None

class Recommendation(BaseModel):
    activity: str
    reason: str
    confidence: float = Field(..., ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------
groq_client = AsyncGroq(api_key=settings.groq_api_key)
gemini_client = genai.Client(api_key=settings.gemini_api_key)
http_client = httpx.AsyncClient(timeout=10.0)

_rabbitmq_connection = None
_rabbitmq_healthy = False


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rabbitmq_connection, _rabbitmq_healthy

    try:
        _rabbitmq_connection = await aio_pika.connect_robust(settings.rabbitmq_url)

        declare_channel = await _rabbitmq_connection.channel()
        consume_channel = await _rabbitmq_connection.channel()
        await consume_channel.set_qos(prefetch_count=settings.prefetch_count)

        quiz_exchange = await declare_channel.declare_exchange(
            settings.quiz_exchange, aio_pika.ExchangeType.TOPIC, durable=True
        )

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

        consume_queue = await consume_channel.declare_queue(settings.quiz_queue, durable=True)
        await consume_queue.consume(on_quiz_submitted)

        _rabbitmq_healthy = True

    except Exception:
        _rabbitmq_healthy = False

    yield

    await http_client.aclose()
    if _rabbitmq_connection and not _rabbitmq_connection.is_closed:
        await _rabbitmq_connection.close()


app = FastAPI(lifespan=lifespan)


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------
def build_quiz_prompt(answers: list[QuizAnswer]) -> str:
    lines = ["Customer's Quiz Responses:", ""]
    for answer in answers:
        question = answer.question_text or f"Question {answer.question_id}"
        option = answer.option_text or f"Option {answer.selected_option_id}"
        lines.append(f"- {question}: {option}")
    lines += ["", "Based on these responses, recommend the best activity."]
    return "\n".join(lines)


def parse_recommendation(response_text: str) -> Recommendation:
    return Recommendation(**json.loads(response_text))


async def get_ai_recommendation(answers: list[QuizAnswer]) -> Recommendation:
    user_prompt = build_quiz_prompt(answers)

    # Try Groq first
    try:
        completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            model=settings.groq_model,
            temperature=0.3,
        )
        return parse_recommendation(completion.choices[0].message.content.strip())
    except Exception:
        pass

    # Gemini as fallback
    try:
        response = await gemini_client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=QUIZ_SYSTEM_PROMPT,
                temperature=0.3
            )
        )
        return parse_recommendation(response.text.strip())
    except Exception:
        pass

    return Recommendation(
        activity="Unknown",
        reason="Unable to generate a recommendation at this time.",
        confidence=0.0,
    )


async def post_to_orchestrator(event: QuizSubmittedEvent, recommendation: Recommendation) -> None:
    payload = {
        "user_id": event.user_id,
        "submission_id": event.submission_id,
        "recommendation": recommendation.model_dump(),
    }
    response = await http_client.post(settings.orchestrator_url, json=payload)
    response.raise_for_status()


# ---------------------------------------------------------------------------
# RabbitMQ consumer
# ---------------------------------------------------------------------------
async def on_quiz_submitted(message: AbstractIncomingMessage) -> None:
    try:
        event = QuizSubmittedEvent(**json.loads(message.body.decode()))
        recommendation = await get_ai_recommendation(event.answers)
        await post_to_orchestrator(event, recommendation)
        await message.ack()
    except Exception:
        logger.exception("Failed to process quiz submission")
        await message.nack(requeue=False)


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
