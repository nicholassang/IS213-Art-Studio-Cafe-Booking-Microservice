from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
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


# ---------------------------------------------------------------------------
# Quiz routes
# ---------------------------------------------------------------------------

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
        res = await client.get(f"{QUIZ_URL}/quiz/submissions/{submission_id}")
    return res.json()


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