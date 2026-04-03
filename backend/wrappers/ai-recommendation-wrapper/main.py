import json
import logging
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import httpx
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
    AVAILABLE_FOOD,
    AVAILABLE_DRINKS,
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

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    supabase_url: str = ""
    supabase_key: str = ""


settings = Settings()

supabase_client = None
if settings.supabase_url and settings.supabase_key:
    from supabase import create_client
    supabase_client = create_client(settings.supabase_url, settings.supabase_key)

groq_client = AsyncGroq(api_key=settings.groq_api_key)
gemini_client = None
if settings.gemini_api_key:
    gemini_client = genai.Client(api_key=settings.gemini_api_key)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="AI Recommendation Service",
    description="Receives Q&A from composite, scores and profiles the user, returns recommendations.",
    version="2.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class QuizAnswer(BaseModel):
    question_id: str
    question_text: str
    category: str
    answer_text: str


class RecommendRequest(BaseModel):
    submission_id: str
    user_id: str
    answers: list[QuizAnswer] = Field(..., min_length=1)
    submitted_at: Optional[str] = None
    is_authenticated: bool = True


class ScoringResult(BaseModel):
    solo_social_score: int = Field(..., ge=0, le=10)
    structured_freeform_score: int = Field(..., ge=0, le=10)
    reasoning: str


class ProfileResult(BaseModel):
    profile_title: str
    profile_body: str
    activity_explanations: list[dict]
    food_recommendations: list[dict]
    drink_recommendation: dict
    closing: str


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
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in AI response: {text!r}")
    return json.loads(match.group())


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


# FIX: confidence based on answer detail + score distinctiveness
def _compute_confidence(
    solo_social_score: int,
    structured_freeform_score: int,
    answers: list[QuizAnswer] | None = None,
) -> float:
    """
    Confidence = how much we trust this result.
    - One-word/gibberish answers → below threshold, no recommendations.
    - Brief but meaningful answers → pass, moderate confidence.
    - Thoughtful answers + distinct scores → high confidence.
    """
    # Score distinctiveness (max 0.20) — distinct preferences add confidence
    solo_deviation = abs(solo_social_score - 5) / 5.0
    structured_deviation = abs(structured_freeform_score - 5) / 5.0
    score_confidence = ((solo_deviation + structured_deviation) / 2) * 0.20

    # Answer quality (max 0.40) — ~100 chars avg → full credit
    answer_quality = 0.0
    if answers:
        avg_len = sum(len(a.answer_text.strip()) for a in answers) / len(answers)
        answer_quality = min(avg_len / 100.0, 1.0) * 0.40

    # Base floor 0.40
    return round(0.40 + score_confidence + answer_quality, 2)


def _format_answers(answers: list[QuizAnswer]) -> str:
    lines = []
    for i, a in enumerate(answers, 1):
        lines.append(f"Q{i} ({a.category}): {a.question_text}")
        lines.append(f"  Answer: {a.answer_text}")
        lines.append("")
    return "\n".join(lines)


def _extract_recommendations(profile: ProfileResult) -> list[str]:
    return [
        item["activity"]
        for item in sorted(profile.activity_explanations, key=lambda x: x["rank"])
    ]


def _extract_food_recommendations(profile: ProfileResult) -> list[str]:
    return [
        item["food"]
        for item in sorted(profile.food_recommendations, key=lambda x: x["rank"])
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
    disliked_activities: Optional[list[str]] = None,
    disliked_food: Optional[list[str]] = None,
    disliked_drinks: Optional[list[str]] = None,
) -> ProfileResult:
    if disliked_activities is None:
        disliked_activities = []
    if disliked_food is None:
        disliked_food = []
    if disliked_drinks is None:
        disliked_drinks = []

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
        disliked_food,
        disliked_drinks,
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
    food_recommendations: list[str],
    food_recommendation_details: list[dict],
    drink_recommendation: str,
    drink_recommendation_details: dict,
    profile: ProfileResult,
    confidence: float,
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
        # FIX: store food and drink fields so GET /quiz/results returns complete data
        "food_recommendations": food_recommendations,
        "food_recommendation_details": food_recommendation_details,
        "drink_recommendation": drink_recommendation,
        "drink_recommendation_details": drink_recommendation_details,
        "profile_title": profile.profile_title,
        "profile_body": profile.profile_body,
        "activity_explanations": profile.activity_explanations,
        "closing": profile.closing,
        # FIX: confidence passed in from recommend() — no recalculation here
        "confidence_score": confidence,
    }

    try:
        result = supabase_client.table("quiz_results").insert(record).execute()
        if result.data:
            logger.info(f"Stored result for {submission_id} (confidence: {confidence})")
        else:
            logger.warning(f"Supabase returned empty for {submission_id}")
    except Exception as e:
        logger.error(f"Failed to store result for {submission_id}: {e}")
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
            logger.info(f"Stored minimal result for {submission_id}")
        except Exception as e2:
            logger.error(f"Failed to store even minimal result for {submission_id}: {e2}")


# ---------------------------------------------------------------------------
# Main endpoint — called by composite with Q&A from quiz atomic
# ---------------------------------------------------------------------------
@app.post("/recommend")
async def recommend(request: RecommendRequest):
    """
    Receive Q&A from the composite, run AI scoring + profile generation,
    store result in Supabase, and return the full recommendation to the composite.
    """
    logger.info(f"Processing recommendation for submission {request.submission_id}")

    # FIX: idempotency guard — if a result already exists, return it without re-running AI
    if supabase_client:
        try:
            existing = (
                supabase_client.table("quiz_results")
                .select("*")
                .eq("submission_id", request.submission_id)
                .execute()
            )
            if existing.data:
                logger.info(
                    f"Result already exists for {request.submission_id}, returning stored result"
                )
                stored = existing.data[0]
                return {
                    "submission_id": stored["submission_id"],
                    "personality_type": stored["personality_type"],
                    "solo_social_score": stored["solo_social_score"],
                    "structured_freeform_score": stored["structured_freeform_score"],
                    "scoring_reasoning": stored["scoring_reasoning"],
                    "profile_title": stored["profile_title"],
                    "profile_body": stored["profile_body"],
                    "recommendations": stored["recommendations"],
                    "activity_explanations": stored["activity_explanations"],
                    "food_recommendations": stored.get("food_recommendations", []),
                    "food_recommendation_details": stored.get("food_recommendation_details", []),
                    "drink_recommendation": stored.get("drink_recommendation", ""),
                    "drink_recommendation_details": stored.get("drink_recommendation_details", {}),
                    "closing": stored["closing"],
                    "confidence_score": stored["confidence_score"],
                }
        except Exception as e:
            logger.warning(f"Could not check for existing result for {request.submission_id}: {e}")

    try:
        scores = await score_answers(request.answers)
        personality_type = _map_scores(scores.solo_social_score, scores.structured_freeform_score)
        logger.info(
            f"Scored: Solo↔Social={scores.solo_social_score}, "
            f"Structured↔Freeform={scores.structured_freeform_score} → {personality_type}"
        )

        profile = await generate_profile(request.answers, scores, personality_type)
        recommendations = _extract_recommendations(profile)
        food_recommendations = _extract_food_recommendations(profile)
        drink_recommendation = profile.drink_recommendation.get("drink", "")

        logger.info(
            f"Profile generated: {profile.profile_title} | "
            f"Activities: {recommendations} | "
            f"Food: {food_recommendations} | "
            f"Drink: {drink_recommendation}"
        )

        # FIX: compute confidence once and pass it through
        confidence = _compute_confidence(scores.solo_social_score, scores.structured_freeform_score, request.answers)

        # When confidence is below 50 %, answers were too brief to categorise or recommend.
        if confidence < 0.50:
            low_conf_result = {
                "submission_id": request.submission_id,
                "personality_type": "Unknown",
                "solo_social_score": scores.solo_social_score,
                "structured_freeform_score": scores.structured_freeform_score,
                "scoring_reasoning": scores.reasoning,
                "profile_title": "We'd love to know you better",
                "profile_body": (
                    "Your answers were a bit too brief for us to build a meaningful personality profile. "
                    "We didn't want to guess — your creative preferences deserve more than a wild stab in the dark. "
                    "Try retaking the quiz with a few more details about what you enjoy, and we'll have a much clearer picture next time."
                ),
                "recommendations": [],
                "activity_explanations": [],
                "food_recommendations": [],
                "food_recommendation_details": [],
                "drink_recommendation": "",
                "drink_recommendation_details": {},
                "closing": "Take your time, share a bit more about yourself, and we'll find something perfect for you. ☕",
                "confidence_score": confidence,
            }

            # Only store results for authenticated users
            if request.is_authenticated:
                await store_result(
                    request.submission_id,
                    request.user_id,
                    request.answers,
                    scores,
                    low_conf_result["personality_type"],
                    [],
                    [],
                    [],
                    "",
                    {},
                    ProfileResult(
                        profile_title=low_conf_result["profile_title"],
                        profile_body=low_conf_result["profile_body"],
                        activity_explanations=[],
                        food_recommendations=[],
                        drink_recommendation={"drink": "", "explanation": ""},
                        closing=low_conf_result["closing"],
                    ),
                    confidence,
                )

            return low_conf_result

        profile = await generate_profile(request.answers, scores, personality_type)
        recommendations = _extract_recommendations(profile)
        food_recommendations = _extract_food_recommendations(profile)
        drink_recommendation = profile.drink_recommendation.get("drink", "")

        logger.info(
            f"Profile generated: {profile.profile_title} | "
            f"Activities: {recommendations} | "
            f"Food: {food_recommendations} | "
            f"Drink: {drink_recommendation}"
        )

        # Only store results for authenticated users
        if request.is_authenticated:
            await store_result(
                request.submission_id,
                request.user_id,
                request.answers,
                scores,
                personality_type,
                recommendations,
                food_recommendations,
                profile.food_recommendations,
                drink_recommendation,
                profile.drink_recommendation,
                profile,
                confidence,
            )

        return {
            "submission_id": request.submission_id,
            "personality_type": personality_type,
            "solo_social_score": scores.solo_social_score,
            "structured_freeform_score": scores.structured_freeform_score,
            "scoring_reasoning": scores.reasoning,
            "profile_title": profile.profile_title,
            "profile_body": profile.profile_body,
            "recommendations": recommendations,
            "activity_explanations": profile.activity_explanations,
            "food_recommendations": food_recommendations,
            "food_recommendation_details": profile.food_recommendations,
            "drink_recommendation": drink_recommendation,
            "drink_recommendation_details": profile.drink_recommendation,
            "closing": profile.closing,
            "confidence_score": confidence,
        }

    except Exception as e:
        logger.error(f"Failed to generate recommendation for {request.submission_id}: {e}")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")


# ---------------------------------------------------------------------------
# Result retrieval — composite fetches stored results by submission_id
# ---------------------------------------------------------------------------
@app.get("/quiz/results/{submission_id}")
async def get_quiz_results(submission_id: str):
    """Fetch AI-generated results for a submission from Supabase."""
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
            raise HTTPException(status_code=404, detail="Results not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch results for {submission_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Health
# FIX: Gemini is optional — its absence should not mark the service unhealthy
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
