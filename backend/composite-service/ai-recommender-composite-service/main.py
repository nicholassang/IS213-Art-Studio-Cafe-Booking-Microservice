from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
import logging
from datetime import datetime
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

QUIZ_URL = "http://quiz-service:8000"
AI_RECOMMENDATION_URL = "http://ai-recommendation-wrapper:8000"

# In-memory storage for recommendations (for testing)
recommendations_store: List[Dict[str, Any]] = []


def _normalize_recommendation_list(raw: Any) -> List[str]:
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()][:3]
    if isinstance(raw, str) and raw.strip():
        text = raw.strip()
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()][:3]
            if isinstance(parsed, str):
                return [parsed.strip()]
        except json.JSONDecodeError:
            if "|" in text:
                return [part.strip() for part in text.split("|") if part.strip()][:3]
            if "," in text:
                return [part.strip() for part in text.split(",") if part.strip()][:3]
            return [text]
    return []


def _normalize_confidence(raw: Any, fallback: float = 0.50) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        value = fallback
    if value > 1:
        value = value / 100.0
    return max(0.0, min(1.0, value))


def _pick_top_reason(recommendations: List[str], explanations: Any, profile_title: str) -> str:
    if isinstance(explanations, list):
        for item in explanations:
            if not isinstance(item, dict):
                continue
            try:
                rank = int(item.get("rank"))
            except (TypeError, ValueError):
                rank = None
            activity = str(item.get("activity", "")).strip().lower()
            reason = str(item.get("explanation", "")).strip()
            if reason and rank == 1:
                return reason
            if reason and recommendations and activity == recommendations[0].strip().lower():
                return reason
    return profile_title


# ---------------------------------------------------------------------------
# Quiz routes
# ---------------------------------------------------------------------------

@app.post("/quiz/session")
async def start_session(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{QUIZ_URL}/quiz/session", json=body)
    return res.json()


@app.get("/quiz/session/{session_id}")
async def get_session(session_id: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{QUIZ_URL}/quiz/session/{session_id}")
    return res.json()


@app.post("/quiz/session/{session_id}/answer")
async def submit_answer(session_id: str, request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{QUIZ_URL}/quiz/session/{session_id}/answer", json=body)
    return res.json()


@app.put("/quiz/session/{session_id}/answer/{question_id}")
async def edit_answer(session_id: str, question_id: str, request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.put(f"{QUIZ_URL}/quiz/session/{session_id}/answer/{question_id}", json=body)
    return res.json()


@app.get("/quiz/session/{session_id}/progress")
async def get_progress(session_id: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{QUIZ_URL}/quiz/session/{session_id}/progress")
    return res.json()


@app.post("/quiz/session/{session_id}/submit")
async def submit_session(session_id: str, request: Request):
    body = await request.json() if await request.body() else {}
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{QUIZ_URL}/quiz/session/{session_id}/submit", json=body)
    return res.json()


@app.get("/quiz/questions")
async def get_questions(category: str = None):
    params = {"category": category} if category else {}
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{QUIZ_URL}/quiz/questions", params=params)
    return res.json()


@app.get("/quiz/questions/{question_id}")
async def get_question(question_id: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{QUIZ_URL}/quiz/questions/{question_id}")
    return res.json()


@app.post("/quiz/submit")
async def submit_quiz(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{QUIZ_URL}/quiz/submit", json=body)
    return res.json()


@app.get("/quiz/submissions")
async def list_submissions(user_id: str = None):
    params = {"user_id": user_id} if user_id else {}
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{QUIZ_URL}/quiz/submissions", params=params)
    return res.json()


@app.get("/quiz/submissions/user/{user_id}")
async def get_user_submission(user_id: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{QUIZ_URL}/quiz/submissions/user/{user_id}")
    return res.json()


@app.get("/quiz/submissions/{submission_id}")
async def get_submission(submission_id: str):
    async with httpx.AsyncClient() as client:
        # Fetch raw submission from quiz service
        sub_res = await client.get(f"{QUIZ_URL}/quiz/submissions/{submission_id}")
        if sub_res.status_code != 200:
            raise HTTPException(status_code=sub_res.status_code, detail=sub_res.text)
        submission = sub_res.json()

    # Fetch AI recommendation from wrapper
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            ai_res = await client.get(f"{AI_RECOMMENDATION_URL}/quiz/results/{submission_id}")
            if ai_res.status_code == 200:
                ai_data = ai_res.json()
                # Build the recommendation object the frontend expects
                rec_activity = _normalize_recommendation_list(ai_data.get("recommendations", []))
                explanations = ai_data.get("activity_explanations", [])
                top_reason = _pick_top_reason(rec_activity, explanations, ai_data.get("profile_title", ""))
                submission["recommendation"] = {
                    "activity": rec_activity[0] if rec_activity else "",
                    "activities": rec_activity,
                    "reason": top_reason,
                    "confidence": _normalize_confidence(ai_data.get("confidence_score"), fallback=0.50),
                    "personality_type": ai_data.get("personality_type", ""),
                    "explanations": explanations,
                    "profile_body": ai_data.get("profile_body", ""),
                    "closing": ai_data.get("closing", ""),
                }
    except Exception:
        # AI results may still be processing — return submission without recommendation
        logger.warning(f"AI recommendation not yet available for {submission_id}")

    return submission


@app.put("/quiz/submissions/{submission_id}")
async def update_submission(submission_id: str, request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.put(f"{QUIZ_URL}/quiz/submissions/{submission_id}", json=body)
    return res.json()


@app.delete("/quiz/submissions/{submission_id}")
async def delete_submission(submission_id: str):
    async with httpx.AsyncClient() as client:
        res = await client.delete(f"{QUIZ_URL}/quiz/submissions/{submission_id}")
    return Response(status_code=res.status_code)


# ---------------------------------------------------------------------------
# AI Recommendation routes
# ---------------------------------------------------------------------------

@app.post("/recommend/submit")
async def recommend_and_submit(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{AI_RECOMMENDATION_URL}/recommend/submit", json=body)
    return res.json()


@app.post("/recommend/preview")
async def preview_recommendation(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{AI_RECOMMENDATION_URL}/recommend/preview", json=body)
    return res.json()


@app.post("/api/recommendations")
async def receive_recommendation(request: Request):
    """Receive and store a recommendation from the AI wrapper."""
    body = await request.json()
    body["received_at"] = datetime.utcnow().isoformat()
    recommendations_store.append(body)
    logger.info(f"Stored recommendation for submission {body.get('submission_id')}")
    return {"status": "received", "submission_id": body.get("submission_id")}


@app.get("/api/recommendations")
async def list_recommendations(user_id: str = None):
    """List all stored recommendations, optionally filtered by user_id."""
    if user_id:
        return [r for r in recommendations_store if r.get("user_id") == user_id]
    return recommendations_store


@app.get("/api/recommendations/{submission_id}")
async def get_recommendation(submission_id: str):
    """Get a specific recommendation by submission_id."""
    for rec in recommendations_store:
        if rec.get("submission_id") == submission_id:
            return rec
    raise HTTPException(status_code=404, detail="Recommendation not found")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    results = {}
    async with httpx.AsyncClient() as client:
        for name, url in [("quiz", QUIZ_URL), ("ai_recommendation", AI_RECOMMENDATION_URL)]:
            try:
                res = await client.get(f"{url}/health", timeout=3.0)
                results[name] = res.json()
            except Exception as exc:
                results[name] = {"status": "unreachable", "error": str(exc)}
    return results
