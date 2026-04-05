import logging
import os
from importlib import import_module

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from psycopg import connect
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from prompts import SCORING_SYSTEM_PROMPT, build_profile_system_prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AI_WRAPPER_URL = os.getenv("AI_WRAPPER_URL", "http://ai-recommendation-wrapper:8000")
DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

storage_backend = None
supabase_client = None

if DATABASE_URL:
    storage_backend = "postgres"
    logger.info("AI recommender service configured to use Postgres result storage")
elif SUPABASE_URL and SUPABASE_KEY:
    try:
        create_client = import_module("supabase").create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        storage_backend = "supabase"
        logger.info("AI recommender service configured to use Supabase result storage")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("AI recommender result storage not configured")

app = FastAPI(
    title="AI Recommender Service",
    description="Orchestrates AI scoring, profiling, and recommendation storage.",
    version="1.0.0",
)


class QuizAnswer(BaseModel):
    question_id: str
    question_text: str
    category: str
    answer_text: str


class RecommendRequest(BaseModel):
    submission_id: str
    user_id: str
    answers: list[QuizAnswer] = Field(..., min_length=1)
    submitted_at: str | None = None
    is_authenticated: bool = True
    activities: list[str] | None = None
    food: list[str] | None = None
    drinks: list[str] | None = None


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


def _connect_db():
    return connect(DATABASE_URL, row_factory=dict_row)


def _ensure_postgres_schema() -> None:
    if storage_backend != "postgres":
        return

    with _connect_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS quiz_results (
                    id BIGSERIAL PRIMARY KEY,
                    submission_id text NOT NULL UNIQUE,
                    user_id text NOT NULL,
                    answers jsonb NOT NULL,
                    solo_social_score integer NOT NULL,
                    structured_freeform_score integer NOT NULL,
                    scoring_reasoning text,
                    personality_type text NOT NULL,
                    recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
                    food_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
                    food_recommendation_details jsonb NOT NULL DEFAULT '[]'::jsonb,
                    drink_recommendation text NOT NULL DEFAULT '',
                    drink_recommendation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
                    profile_title text,
                    profile_body text,
                    activity_explanations jsonb NOT NULL DEFAULT '[]'::jsonb,
                    closing text,
                    confidence_score double precision,
                    submitted_at text,
                    created_at timestamptz NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results (user_id)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_quiz_results_submission_id ON quiz_results (submission_id)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_quiz_results_personality_type ON quiz_results (personality_type)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_quiz_results_submitted_at ON quiz_results (submitted_at)"
            )
        conn.commit()


def _require_storage():
    if storage_backend == "postgres":
        return
    if storage_backend == "supabase" and supabase_client:
        return
    raise HTTPException(status_code=503, detail="Results storage not configured")


def _supabase_fetch(description: str, query, allow_empty: bool = False):
    try:
        result = query.execute()
        if not result.data and not allow_empty:
            raise HTTPException(status_code=404, detail="Results not found")
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to {description}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _postgres_fetch_one(query: str, params: tuple = ()):
    try:
        with _connect_db() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchone()
    except Exception as e:
        logger.error(f"Failed Postgres query: {e}")
        raise HTTPException(status_code=500, detail="Failed to query stored results")


def _postgres_fetch_all(query: str, params: tuple = ()):
    try:
        with _connect_db() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchall()
    except Exception as e:
        logger.error(f"Failed Postgres query: {e}")
        raise HTTPException(status_code=500, detail="Failed to query stored results")


def _map_scores(solo_social: int, structured_freeform: int) -> str:
    social = solo_social >= 5
    freeform = structured_freeform >= 5

    if social and not freeform:
        return "Workshop Goer"
    if social and freeform:
        return "Free Spirit"
    if not social and not freeform:
        return "Craftsman"
    return "Dreamer"


def _compute_confidence(
    solo_social_score: int,
    structured_freeform_score: int,
    answers: list[QuizAnswer] | None = None,
) -> float:
    solo_deviation = abs(solo_social_score - 5) / 5.0
    structured_deviation = abs(structured_freeform_score - 5) / 5.0
    score_confidence = ((solo_deviation + structured_deviation) / 2) * 0.20

    answer_quality = 0.0
    if answers:
        avg_len = sum(len(answer.answer_text.strip()) for answer in answers) / len(answers)
        answer_quality = min(avg_len / 100.0, 1.0) * 0.40

    return round(0.40 + score_confidence + answer_quality, 2)


def _extract_recommendations(profile: ProfileResult) -> list[str]:
    return [
        item["activity"]
        for item in sorted(profile.activity_explanations, key=lambda item: item["rank"])
    ]


def _extract_food_recommendations(profile: ProfileResult) -> list[str]:
    return [
        item["food"]
        for item in sorted(profile.food_recommendations, key=lambda item: item["rank"])
    ]


def _build_response(
    submission_id: str,
    personality_type: str,
    scores: ScoringResult | dict,
    profile: ProfileResult | dict,
    recommendations: list[str],
    food_recommendations: list[str],
    food_recommendation_details: list[dict],
    drink_recommendation: str,
    drink_recommendation_details: dict,
    confidence: float,
) -> dict:
    if isinstance(scores, dict):
        solo_score = scores.get("solo_social_score", 0)
        structured_score = scores.get("structured_freeform_score", 0)
        reasoning = scores.get("scoring_reasoning", "")
    else:
        solo_score = scores.solo_social_score
        structured_score = scores.structured_freeform_score
        reasoning = scores.reasoning

    if isinstance(profile, dict):
        profile_title = profile.get("profile_title", "")
        profile_body = profile.get("profile_body", "")
        activity_explanations = profile.get("activity_explanations", [])
        closing = profile.get("closing", "")
    else:
        profile_title = profile.profile_title
        profile_body = profile.profile_body
        activity_explanations = profile.activity_explanations
        closing = profile.closing

    return {
        "submission_id": submission_id,
        "personality_type": personality_type,
        "scores": {
            "solo_social": solo_score,
            "structured_freeform": structured_score,
            "reasoning": reasoning,
        },
        "profile_title": profile_title,
        "profile_body": profile_body,
        "recommendations": recommendations,
        "activity_explanations": activity_explanations,
        "food_recommendations": food_recommendations,
        "food_recommendation_details": food_recommendation_details,
        "drink_recommendation": drink_recommendation,
        "drink_recommendation_details": drink_recommendation_details,
        "closing": closing,
        "confidence_score": confidence,
    }


def _stored_result_to_response(stored: dict) -> dict:
    return _build_response(
        submission_id=stored["submission_id"],
        personality_type=stored["personality_type"],
        scores=stored,
        profile=stored,
        recommendations=stored.get("recommendations", []),
        food_recommendations=stored.get("food_recommendations", []),
        food_recommendation_details=stored.get("food_recommendation_details", []),
        drink_recommendation=stored.get("drink_recommendation", ""),
        drink_recommendation_details=stored.get("drink_recommendation_details", {}),
        confidence=stored.get("confidence_score") or 0,
    )


@app.on_event("startup")
async def startup_event():
    if storage_backend == "postgres":
        _ensure_postgres_schema()


async def call_ai_score(answers: list[QuizAnswer]) -> ScoringResult:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{AI_WRAPPER_URL}/score",
            json={
                "answers": [answer.model_dump() for answer in answers],
                "system_prompt": SCORING_SYSTEM_PROMPT,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return ScoringResult(**resp.json())


async def call_ai_profile(
    answers: list[QuizAnswer],
    scores: ScoringResult,
    personality_type: str,
    activities: list[str],
    food_items: list[str],
    drink_items: list[str],
    disliked_activities: list[str] | None = None,
    disliked_food: list[str] | None = None,
    disliked_drinks: list[str] | None = None,
) -> ProfileResult:
    system_prompt = build_profile_system_prompt(
        personality_type,
        scores.model_dump(),
        activities=activities,
        food_items=food_items,
        drink_items=drink_items,
        disliked_activities=disliked_activities or [],
        disliked_food=disliked_food or [],
        disliked_drinks=disliked_drinks or [],
    )

    payload = {
        "answers": [answer.model_dump() for answer in answers],
        "scores": scores.model_dump(),
        "personality_type": personality_type,
        "activities": activities,
        "food_items": food_items,
        "drink_items": drink_items,
        "system_prompt": system_prompt,
        "disliked_activities": disliked_activities,
        "disliked_food": disliked_food,
        "disliked_drinks": disliked_drinks,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{AI_WRAPPER_URL}/profile", json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return ProfileResult(**resp.json())


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
    submitted_at: str | None = None,
) -> None:
    if storage_backend == "postgres":
        try:
            with _connect_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO quiz_results (
                            submission_id, user_id, answers, solo_social_score,
                            structured_freeform_score, scoring_reasoning, personality_type,
                            recommendations, food_recommendations, food_recommendation_details,
                            drink_recommendation, drink_recommendation_details, profile_title,
                            profile_body, activity_explanations, closing, confidence_score,
                            submitted_at
                        )
                        VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s, %s,
                            %s
                        )
                        ON CONFLICT (submission_id) DO UPDATE SET
                            user_id = EXCLUDED.user_id,
                            answers = EXCLUDED.answers,
                            solo_social_score = EXCLUDED.solo_social_score,
                            structured_freeform_score = EXCLUDED.structured_freeform_score,
                            scoring_reasoning = EXCLUDED.scoring_reasoning,
                            personality_type = EXCLUDED.personality_type,
                            recommendations = EXCLUDED.recommendations,
                            food_recommendations = EXCLUDED.food_recommendations,
                            food_recommendation_details = EXCLUDED.food_recommendation_details,
                            drink_recommendation = EXCLUDED.drink_recommendation,
                            drink_recommendation_details = EXCLUDED.drink_recommendation_details,
                            profile_title = EXCLUDED.profile_title,
                            profile_body = EXCLUDED.profile_body,
                            activity_explanations = EXCLUDED.activity_explanations,
                            closing = EXCLUDED.closing,
                            confidence_score = EXCLUDED.confidence_score,
                            submitted_at = EXCLUDED.submitted_at
                        """,
                        (
                            submission_id,
                            user_id,
                            Jsonb([answer.model_dump() for answer in answers]),
                            scores.solo_social_score,
                            scores.structured_freeform_score,
                            scores.reasoning,
                            personality_type,
                            Jsonb(recommendations),
                            Jsonb(food_recommendations),
                            Jsonb(food_recommendation_details),
                            drink_recommendation,
                            Jsonb(drink_recommendation_details),
                            profile.profile_title,
                            profile.profile_body,
                            Jsonb(profile.activity_explanations),
                            profile.closing,
                            confidence,
                            submitted_at,
                        ),
                    )
                conn.commit()
            logger.info(f"Stored result for {submission_id} in Postgres")
        except Exception as e:
            logger.error(f"Failed to store result for {submission_id} in Postgres: {e}")
        return

    if not supabase_client:
        logger.warning("Results storage not configured — skipping storage")
        return

    record = {
        "submission_id": submission_id,
        "user_id": user_id,
        "answers": [answer.model_dump() for answer in answers],
        "solo_social_score": scores.solo_social_score,
        "structured_freeform_score": scores.structured_freeform_score,
        "scoring_reasoning": scores.reasoning,
        "personality_type": personality_type,
        "recommendations": recommendations,
        "food_recommendations": food_recommendations,
        "food_recommendation_details": food_recommendation_details,
        "drink_recommendation": drink_recommendation,
        "drink_recommendation_details": drink_recommendation_details,
        "profile_title": profile.profile_title,
        "profile_body": profile.profile_body,
        "activity_explanations": profile.activity_explanations,
        "closing": profile.closing,
        "confidence_score": confidence,
        "submitted_at": submitted_at,
    }

    try:
        result = supabase_client.table("quiz_results").insert(record).execute()
        if result.data:
            logger.info(f"Stored result for {submission_id} in Supabase")
        else:
            logger.warning(f"Supabase returned empty for {submission_id}")
    except Exception as e:
        logger.error(f"Failed to store result for {submission_id}: {e}")


def _fetch_existing_result(submission_id: str) -> dict | None:
    if storage_backend == "postgres":
        return _postgres_fetch_one(
            "SELECT * FROM quiz_results WHERE submission_id = %s LIMIT 1",
            (submission_id,),
        )

    if not supabase_client:
        return None

    existing = (
        supabase_client.table("quiz_results")
        .select("*")
        .eq("submission_id", submission_id)
        .execute()
    )
    return existing.data[0] if existing.data else None


@app.post("/recommend")
async def recommend(request: RecommendRequest):
    logger.info(f"Processing recommendation for submission {request.submission_id}")

    try:
        existing = _fetch_existing_result(request.submission_id)
        if existing:
            logger.info(f"Result already exists for {request.submission_id}, returning stored result")
            return _stored_result_to_response(existing)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not check for existing result for {request.submission_id}: {e}")

    try:
        scores = await call_ai_score(request.answers)
        personality_type = _map_scores(scores.solo_social_score, scores.structured_freeform_score)
        confidence = _compute_confidence(
            scores.solo_social_score,
            scores.structured_freeform_score,
            request.answers,
        )

        logger.info(
            f"Scored: Solo↔Social={scores.solo_social_score}, "
            f"Structured↔Freeform={scores.structured_freeform_score} → {personality_type}"
        )

        if confidence < 0.50:
            low_conf_profile = ProfileResult(
                profile_title="We'd love to know you better",
                profile_body=(
                    "Your answers were a bit too brief for us to build a meaningful personality profile. "
                    "Try retaking the quiz with a few more details about what you enjoy, and we'll have a much clearer picture next time."
                ),
                activity_explanations=[],
                food_recommendations=[],
                drink_recommendation={"drink": "", "explanation": ""},
                closing="Take your time, share a bit more about yourself, and we'll find something perfect for you."
            )

            if request.is_authenticated:
                await store_result(
                    request.submission_id,
                    request.user_id,
                    request.answers,
                    scores,
                    "Unknown",
                    [],
                    [],
                    [],
                    "",
                    {},
                    low_conf_profile,
                    confidence,
                    request.submitted_at,
                )

            return _build_response(
                submission_id=request.submission_id,
                personality_type="Unknown",
                scores=scores,
                profile=low_conf_profile,
                recommendations=[],
                food_recommendations=[],
                food_recommendation_details=[],
                drink_recommendation="",
                drink_recommendation_details={},
                confidence=confidence,
            )

        profile = await call_ai_profile(
            request.answers,
            scores,
            personality_type,
            activities=request.activities or [],
            food_items=request.food or [],
            drink_items=request.drinks or [],
        )
        recommendations = _extract_recommendations(profile)
        food_recommendations = _extract_food_recommendations(profile)
        drink_recommendation = profile.drink_recommendation.get("drink", "")

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
                request.submitted_at,
            )

        return _build_response(
            submission_id=request.submission_id,
            personality_type=personality_type,
            scores=scores,
            profile=profile,
            recommendations=recommendations,
            food_recommendations=food_recommendations,
            food_recommendation_details=profile.food_recommendations,
            drink_recommendation=drink_recommendation,
            drink_recommendation_details=profile.drink_recommendation,
            confidence=confidence,
        )
    except Exception as e:
        logger.error(f"Failed to generate recommendation for {request.submission_id}: {e}")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")


@app.get("/quiz/results/{submission_id}")
async def get_quiz_results(submission_id: str):
    _require_storage()

    if storage_backend == "postgres":
        result = _postgres_fetch_one(
            "SELECT * FROM quiz_results WHERE submission_id = %s LIMIT 1",
            (submission_id,),
        )
        if not result:
            raise HTTPException(status_code=404, detail="Results not found")
        return result

    result = _supabase_fetch(
        f"fetch results for {submission_id}",
        supabase_client.table("quiz_results").select("*").eq("submission_id", submission_id),
    )
    return result[0]


@app.get("/quiz/user-results")
async def get_user_results(user_id: str):
    if storage_backend == "postgres":
        rows = _postgres_fetch_all(
            """
            SELECT submission_id, personality_type, confidence_score, submitted_at
            FROM quiz_results
            WHERE user_id = %s
            ORDER BY COALESCE(submitted_at, '') DESC, submission_id DESC
            """,
            (user_id,),
        )
        return {"results": rows}

    if not supabase_client:
        return {"results": []}

    result = _supabase_fetch(
        f"fetch results for user {user_id}",
        supabase_client.table("quiz_results")
        .select("submission_id, personality_type, confidence_score, submitted_at")
        .eq("user_id", user_id)
        .order("submission_id", desc=True),
        allow_empty=True,
    )
    return {"results": result}


@app.get("/health")
async def health_check():
    issues = []

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{AI_WRAPPER_URL}/health")
            if resp.status_code != 200:
                issues.append(f"AI wrapper unhealthy: {resp.status_code}")
    except Exception as e:
        issues.append(f"AI wrapper unreachable: {e}")

    if storage_backend == "postgres":
        try:
            _postgres_fetch_one("SELECT 1")
        except HTTPException as e:
            issues.append(str(e.detail))
    elif storage_backend is None:
        issues.append("Results storage not configured")

    if issues:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "issues": issues})
    return {"status": "healthy"}
