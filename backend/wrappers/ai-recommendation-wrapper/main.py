import json
import logging
import re

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from groq import AsyncGroq
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    groq_api_key: str
    groq_model: str = "llama-3.1-8b-instant"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"


settings = Settings()

groq_client = AsyncGroq(api_key=settings.groq_api_key)
gemini_client = None
if settings.gemini_api_key:
    gemini_client = genai.Client(api_key=settings.gemini_api_key)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Recommendation Wrapper",
    description="Wrapper that calls Groq and Gemini AI APIs for scoring and profiling.",
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class QuizAnswer(BaseModel):
    question_id: str
    question_text: str
    category: str
    answer_text: str


class ScoreRequest(BaseModel):
    answers: list[QuizAnswer] = Field(..., min_length=1)
    system_prompt: str


class ProfileRequest(BaseModel):
    answers: list[QuizAnswer]
    scores: dict
    personality_type: str
    activities: list[str]
    food_items: list[str]
    drink_items: list[str]
    system_prompt: str
    disliked_activities: list[str] | None = None
    disliked_food: list[str] | None = None
    disliked_drinks: list[str] | None = None


# ---------------------------------------------------------------------------
# AI call functions
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
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in AI response: {text!r}")
    return json.loads(match.group())


def _format_answers(answers: list[QuizAnswer]) -> str:
    lines = []
    for i, a in enumerate(answers, 1):
        lines.append(f"Q{i} ({a.category}): {a.question_text}")
        lines.append(f"  Answer: {a.answer_text}")
        lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Endpoints — called by ai-recommender-service
# ---------------------------------------------------------------------------
@app.post("/score")
async def score(request: ScoreRequest):
    """Call AI to score quiz answers. Returns solo_social_score, structured_freeform_score, reasoning."""
    user_prompt = (
        "Customer's Quiz Responses:\n\n"
        + _format_answers(request.answers)
        + "Score this customer on the Solo↔Social and Structured↔Freeform axes."
    )
    response_text = await _call_ai(request.system_prompt, user_prompt, temperature=0)
    return _parse_json_response(response_text)


@app.post("/profile")
async def profile(request: ProfileRequest):
    """Call AI to generate a personalised profile. Returns profile_title, profile_body, activity_explanations, etc."""
    disliked_activities = request.disliked_activities or []
    disliked_food = request.disliked_food or []
    disliked_drinks = request.disliked_drinks or []

    user_prompt = (
        "Customer's Quiz Responses:\n\n"
        + _format_answers(request.answers)
        + f"Personality Type: {request.personality_type}\n"
        + f"Solo↔Social Score: {request.scores.get('solo_social_score')}/10\n"
        + f"Structured↔Freeform Score: {request.scores.get('structured_freeform_score')}/10\n"
        + f"Scoring Reasoning: {request.scores.get('reasoning')}\n\n"
        + "Write a personalised profile for this customer."
    )
    response_text = await _call_ai(request.system_prompt, user_prompt, temperature=0.7)
    return _parse_json_response(response_text)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health_check():
    issues = []
    if not settings.groq_api_key:
        issues.append("GROQ_API_KEY missing")
    if issues:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "issues": issues})
    status = {"status": "healthy"}
    if not gemini_client:
        status["warning"] = "GEMINI_API_KEY not set — Groq-only mode, no fallback available"
    return status
