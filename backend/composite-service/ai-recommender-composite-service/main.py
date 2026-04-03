from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging

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


@app.get("/quiz/submissions/{submission_id}")
async def get_submission(submission_id: str):
    async with httpx.AsyncClient() as client:
        sub_res = await client.get(f"{QUIZ_URL}/quiz/submissions/{submission_id}")
        if sub_res.status_code != 200:
            raise HTTPException(status_code=sub_res.status_code, detail=sub_res.text)
        submission = sub_res.json()

    # Fetch AI results and merge into response
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            ai_res = await client.get(f"{AI_RECOMMENDATION_URL}/quiz/results/{submission_id}")
            if ai_res.status_code == 200:
                ai_data = ai_res.json()

                solo_score = ai_data.get("solo_social_score", 5)
                structured_score = ai_data.get("structured_freeform_score", 5)
                recommendations = ai_data.get("recommendations", [])

                # Use stored confidence or calculate it
                if ai_data.get("confidence_score"):
                    confidence = ai_data["confidence_score"]
                else:
                    solo_deviation = abs(solo_score - 5) / 5.0
                    structured_deviation = abs(structured_score - 5) / 5.0
                    confidence = round(0.60 + ((solo_deviation + structured_deviation) / 2) * 0.35, 2)

                submission["recommendation"] = {
                    "activity": recommendations[0] if recommendations else "",
                    "reason": ai_data.get("profile_title", ""),
                    "confidence": confidence,
                    "personality_type": ai_data.get("personality_type", ""),
                    "profile_body": ai_data.get("profile_body", ""),
                    "activity_explanations": ai_data.get("activity_explanations", []),
                    "closing": ai_data.get("closing", ""),
                    "scores": {
                        "solo_social": solo_score,
                        "structured_freeform": structured_score,
                        "reasoning": ai_data.get("scoring_reasoning", ""),
                    },
                }
    except Exception:
        # AI results may still be processing — return submission without recommendation
        logger.warning(f"AI recommendation not yet available for {submission_id}")

    return submission


# ---------------------------------------------------------------------------
# AI Recommendation routes
# ---------------------------------------------------------------------------

@app.post("/recommend/preview")
async def preview_recommendation(request: Request):
    """For testing only — synchronous AI profile generation, bypasses RabbitMQ."""
    body = await request.json()
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(f"{AI_RECOMMENDATION_URL}/recommend/preview", json=body)
    return res.json()


@app.get("/quiz/results/{submission_id}")
async def get_quiz_results(submission_id: str):
    """Fetch raw AI results for a submission directly from the AI recommender."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(f"{AI_RECOMMENDATION_URL}/quiz/results/{submission_id}")
    if res.status_code == 404:
        raise HTTPException(status_code=404, detail="Results not found or still processing")
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)
    return res.json()


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
