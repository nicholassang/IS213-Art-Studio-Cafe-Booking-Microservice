from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Recommender Composite Service",
    description="Orchestrates the quiz and AI recommendation atomics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

QUIZ_URL = "http://quiz-service:8000"
AI_URL = "http://ai-recommender-service:8000"
MAKE_BOOKING_URL = os.getenv("MAKE_BOOKING_URL", "http://composite-service:8000")

# Default timeout for passthrough routes
PASSTHROUGH_TIMEOUT = 10.0


# ---------------------------------------------------------------------------
# HTTP helpers — centralize client creation and error handling
# ---------------------------------------------------------------------------

async def _quiz_passthrough(method: str, path: str, **kwargs) -> JSONResponse:
    """Generic passthrough to quiz service."""
    res = await _http(method, f"{QUIZ_URL}{path}", timeout=PASSTHROUGH_TIMEOUT, **kwargs)
    return JSONResponse(content=res.json(), status_code=res.status_code)


async def _ai_get(path: str) -> dict:
    """GET from AI atomic with standardized error handling."""
    try:
        res = await _http("GET", f"{AI_URL}{path}", timeout=PASSTHROUGH_TIMEOUT)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)
        return res.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timed out fetching AI results")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error: {exc}")


async def _http(method: str, url: str, timeout: float = 10.0, **kwargs):
    """Generic HTTP request with configurable timeout."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.request(method, url, **kwargs)


def _json_field(resp, key: str, default=None):
    """Safely extract a field from a JSON response, returning default on non-200."""
    return resp.json().get(key, default) if resp.status_code == 200 else default


# ---------------------------------------------------------------------------
# Quiz passthrough routes
# (composite exposes these so the frontend only talks to one service)
# ---------------------------------------------------------------------------

@app.post("/quiz/session")
async def start_session(request: Request):
    return await _quiz_passthrough("POST", "/quiz/session", json=await request.json())


@app.get("/quiz/session/{session_id}")
async def get_session(session_id: str):
    return await _quiz_passthrough("GET", f"/quiz/session/{session_id}")


@app.post("/quiz/session/{session_id}/answer")
async def submit_answer(session_id: str, request: Request):
    return await _quiz_passthrough("POST", f"/quiz/session/{session_id}/answer", json=await request.json())


@app.put("/quiz/session/{session_id}/answer/{question_id}")
async def edit_answer(session_id: str, question_id: str, request: Request):
    return await _quiz_passthrough("PUT", f"/quiz/session/{session_id}/answer/{question_id}", json=await request.json())


@app.get("/quiz/session/{session_id}/progress")
async def get_progress(session_id: str):
    return await _quiz_passthrough("GET", f"/quiz/session/{session_id}/progress")


@app.get("/quiz/questions")
async def get_questions(category: str | None = None):
    return await _quiz_passthrough("GET", "/quiz/questions", params={"category": category})


# ---------------------------------------------------------------------------
# Core orchestration route
# Step 1: Tell quiz atomic to submit the session → get back Q&A
# Step 2: Fetch catalog data from make-booking composite
# Step 3: Pass Q&A + catalog data to AI atomic → get back recommendation
# Step 4: Return full result to client
# ---------------------------------------------------------------------------

@app.post("/quiz/session/{session_id}/submit")
async def submit_and_recommend(session_id: str, authenticated: bool = Query(default=True)):
    """
    Orchestrates the full flow:
    1. Submits the quiz session to the quiz atomic → receives Q&A payload
    2. Fetches catalog data from make-booking composite
    3. Passes Q&A + catalog payload to the AI atomic → receives recommendation
    4. Returns the combined result to the client
    """

    # Step 1: Submit quiz session to quiz atomic, get Q&A back
    quiz_res = await _http("POST", f"{QUIZ_URL}/quiz/session/{session_id}/submit", timeout=30.0)
    if quiz_res.status_code not in (200, 201):
        raise HTTPException(
            status_code=quiz_res.status_code,
            detail=f"Quiz submission failed: {quiz_res.text}",
        )

    quiz_data = quiz_res.json()
    logger.info(
        f"Quiz submitted: submission_id={quiz_data['submission_id']}, "
        f"answers={len(quiz_data['answers'])}"
    )

    # Step 2: Fetch activities and menu from make-booking composite
    try:
        activities_resp = await _http("GET", f"{MAKE_BOOKING_URL}/activities", timeout=10.0)
        menu_resp = await _http("GET", f"{MAKE_BOOKING_URL}/menu", timeout=10.0)

        activities_data = _json_field(activities_resp, "activities", [])
        menu_data = _json_field(menu_resp, "menu", [])

        activity_names = [a["name"] for a in activities_data if "name" in a]

        # Separate food and drinks by category (case-insensitive match on known drink categories)
        drink_categories = {"coffee", "smoothie", "lemonade", "hot drink", "iced drink", "tea", "juice", "beverage", "drink"}
        food_items = []
        drink_items = []
        for item in menu_data:
            item_category = item.get("category", "").lower()
            if any(dc in item_category for dc in drink_categories):
                drink_items.append(item["name"])
            else:
                food_items.append(item["name"])
    except Exception as exc:
        logger.warning(f"Failed to fetch catalog data from make-booking composite: {exc}")
        activity_names = []
        food_items = []
        drink_items = []

    # Step 3: Pass Q&A + catalog data to AI atomic
    ai_payload = {
        "submission_id": quiz_data["submission_id"],
        "user_id": quiz_data["user_id"],
        "answers": quiz_data["answers"],
        "submitted_at": quiz_data["submitted_at"],
        "is_authenticated": authenticated,
        "activities": activity_names,
        "food": food_items,
        "drinks": drink_items,
    }
    ai_res = await _http("POST", f"{AI_URL}/recommend", json=ai_payload, timeout=60.0)
    if ai_res.status_code != 200:
        raise HTTPException(
            status_code=ai_res.status_code,
            detail=f"AI recommendation failed: {ai_res.text}",
        )

    ai_data = ai_res.json()
    logger.info(
        f"AI recommendation received: submission_id={ai_data['submission_id']}, "
        f"personality={ai_data['personality_type']}"
    )

    # Step 4: Return combined result to client
    # Wrap the AI response under "recommendation" key for the frontend
    return {
        "submission_id": ai_data["submission_id"],
        "user_id": ai_data.get("user_id"),
        "submitted_at": quiz_data.get("submitted_at"),
        "recommendation": ai_data,
    }


# ---------------------------------------------------------------------------
# Submission retrieval
# Delegates to AI atomic which owns the quiz_results table
# ---------------------------------------------------------------------------

@app.get("/quiz/submissions/{submission_id}")
async def get_submission(submission_id: str):
    """Fetch stored AI results directly from the AI atomic (single source of truth)."""
    raw = await _ai_get(f"/quiz/results/{submission_id}")
    # Transform the raw Supabase record into the same format as the submit endpoint
    # so the ResultPage can consume it identically
    recommendation = {
        "submission_id": raw.get("submission_id"),
        "user_id": raw.get("user_id"),
        "personality_type": raw.get("personality_type"),
        "scores": {
            "solo_social": raw.get("solo_social_score", 0),
            "structured_freeform": raw.get("structured_freeform_score", 0),
            "reasoning": raw.get("scoring_reasoning", ""),
        },
        "profile_title": raw.get("profile_title"),
        "profile_body": raw.get("profile_body"),
        "recommendations": raw.get("recommendations", []),
        "activity_explanations": raw.get("activity_explanations", []),
        "food_recommendations": raw.get("food_recommendations", []),
        "food_recommendation_details": raw.get("food_recommendation_details", []),
        "drink_recommendation": raw.get("drink_recommendation", ""),
        "drink_recommendation_details": raw.get("drink_recommendation_details", {}),
        "closing": raw.get("closing"),
        "confidence_score": raw.get("confidence_score"),
    }
    return {
        "submission_id": raw.get("submission_id"),
        "user_id": raw.get("user_id"),
        "answers": raw.get("answers", []),
        "recommendation": recommendation,
    }


@app.get("/quiz/results/{submission_id}")
async def get_raw_results(submission_id: str):
    """Fetch raw AI results from the AI atomic (unwrapped, direct Supabase data)."""
    return await _ai_get(f"/quiz/results/{submission_id}")


@app.get("/quiz/user-results")
async def get_user_results(user_id: str):
    """Fetch all results for a user directly from the AI atomic."""
    return await _ai_get(f"/quiz/user-results?user_id={user_id}")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    results = {}
    async with httpx.AsyncClient() as client:
        for name, url in [("quiz", QUIZ_URL), ("ai_recommendation", AI_URL)]:
            try:
                res = await client.get(f"{url}/health", timeout=3.0)
                results[name] = res.json()
            except Exception as exc:
                results[name] = {"status": "unreachable", "error": str(exc)}
    return results
