from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
from typing import Optional

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
AI_URL = "http://ai-recommendation-wrapper:8000"

# Default timeout for passthrough routes
PASSTHROUGH_TIMEOUT = 10.0


# ---------------------------------------------------------------------------
# Quiz passthrough routes
# (composite exposes these so the frontend only talks to one service)
# ---------------------------------------------------------------------------

@app.post("/quiz/session")
async def start_session(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=PASSTHROUGH_TIMEOUT) as client:
        res = await client.post(f"{QUIZ_URL}/quiz/session", json=body)
    # FIX: propagate the downstream status code instead of always returning 200
    return JSONResponse(content=res.json(), status_code=res.status_code)


@app.get("/quiz/session/{session_id}")
async def get_session(session_id: str):
    async with httpx.AsyncClient(timeout=PASSTHROUGH_TIMEOUT) as client:
        res = await client.get(f"{QUIZ_URL}/quiz/session/{session_id}")
    return JSONResponse(content=res.json(), status_code=res.status_code)


@app.post("/quiz/session/{session_id}/answer")
async def submit_answer(session_id: str, request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=PASSTHROUGH_TIMEOUT) as client:
        res = await client.post(f"{QUIZ_URL}/quiz/session/{session_id}/answer", json=body)
    return JSONResponse(content=res.json(), status_code=res.status_code)


@app.put("/quiz/session/{session_id}/answer/{question_id}")
async def edit_answer(session_id: str, question_id: str, request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=PASSTHROUGH_TIMEOUT) as client:
        res = await client.put(
            f"{QUIZ_URL}/quiz/session/{session_id}/answer/{question_id}", json=body
        )
    return JSONResponse(content=res.json(), status_code=res.status_code)


@app.get("/quiz/session/{session_id}/progress")
async def get_progress(session_id: str):
    async with httpx.AsyncClient(timeout=PASSTHROUGH_TIMEOUT) as client:
        res = await client.get(f"{QUIZ_URL}/quiz/session/{session_id}/progress")
    return JSONResponse(content=res.json(), status_code=res.status_code)


@app.get("/quiz/questions")
async def get_questions(category: Optional[str] = None):
    # FIX: use Optional[str] = None instead of str = None to avoid deprecation warning
    params = {"category": category} if category else {}
    async with httpx.AsyncClient(timeout=PASSTHROUGH_TIMEOUT) as client:
        res = await client.get(f"{QUIZ_URL}/quiz/questions", params=params)
    return JSONResponse(content=res.json(), status_code=res.status_code)


# ---------------------------------------------------------------------------
# Core orchestration route
# Step 1: Tell quiz atomic to submit the session → get back Q&A
# Step 2: Pass Q&A to AI atomic → get back recommendation
# Step 3: Return full result to client
# ---------------------------------------------------------------------------

@app.post("/quiz/session/{session_id}/submit")
async def submit_and_recommend(session_id: str):
    """
    Orchestrates the full flow:
    1. Submits the quiz session to the quiz atomic → receives Q&A payload
    2. Passes Q&A payload to the AI atomic → receives recommendation
    3. Returns the combined result to the client
    """

    # Step 1: Submit quiz session to quiz atomic, get Q&A back
    async with httpx.AsyncClient(timeout=30.0) as client:
        quiz_res = await client.post(f"{QUIZ_URL}/quiz/session/{session_id}/submit")

    if quiz_res.status_code != 201:
        raise HTTPException(
            status_code=quiz_res.status_code,
            detail=f"Quiz submission failed: {quiz_res.text}",
        )

    quiz_data = quiz_res.json()
    logger.info(
        f"Quiz submitted: submission_id={quiz_data['submission_id']}, "
        f"answers={len(quiz_data['answers'])}"
    )

    # Step 2: Pass Q&A to AI atomic
    ai_payload = {
        "submission_id": quiz_data["submission_id"],
        "user_id": quiz_data["user_id"],
        "answers": quiz_data["answers"],
        "submitted_at": quiz_data["submitted_at"],
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        ai_res = await client.post(f"{AI_URL}/recommend", json=ai_payload)

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

    # Step 3: Return combined result to client
    return {
        "submission_id": quiz_data["submission_id"],
        "user_id": quiz_data["user_id"],
        "submitted_at": quiz_data["submitted_at"],
        "recommendation": {
            "personality_type": ai_data["personality_type"],
            "profile_title": ai_data["profile_title"],
            "profile_body": ai_data["profile_body"],
            "activity_explanations": ai_data["activity_explanations"],
            "recommendations": ai_data["recommendations"],
            "food_recommendations": ai_data["food_recommendations"],
            "food_recommendation_details": ai_data["food_recommendation_details"],
            "drink_recommendation": ai_data["drink_recommendation"],
            "drink_recommendation_details": ai_data["drink_recommendation_details"],
            "closing": ai_data["closing"],
            "confidence_score": ai_data["confidence_score"],
            "scores": {
                "solo_social": ai_data["solo_social_score"],
                "structured_freeform": ai_data["structured_freeform_score"],
                "reasoning": ai_data["scoring_reasoning"],
            },
        },
    }


# ---------------------------------------------------------------------------
# Submission retrieval
# Fetches quiz submission and merges stored AI results
# ---------------------------------------------------------------------------

@app.get("/quiz/submissions/{submission_id}")
async def get_submission(submission_id: str):
    async with httpx.AsyncClient(timeout=PASSTHROUGH_TIMEOUT) as client:
        sub_res = await client.get(f"{QUIZ_URL}/quiz/submissions/{submission_id}")
        if sub_res.status_code != 200:
            raise HTTPException(status_code=sub_res.status_code, detail=sub_res.text)
        submission = sub_res.json()

    # Fetch stored AI results from AI atomic and merge
    # FIX: catch and log specific exception types so real bugs aren't silently swallowed
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            ai_res = await client.get(f"{AI_URL}/quiz/results/{submission_id}")
            if ai_res.status_code == 200:
                ai_data = ai_res.json()

                solo_score = ai_data.get("solo_social_score", 5)
                structured_score = ai_data.get("structured_freeform_score", 5)
                recommendations = ai_data.get("recommendations", [])

                if ai_data.get("confidence_score"):
                    confidence = ai_data["confidence_score"]
                else:
                    # Fallback — matches the atomic service formula
                    solo_deviation = abs(solo_score - 5) / 5.0
                    structured_deviation = abs(structured_score - 5) / 5.0
                    score_confidence = ((solo_deviation + structured_deviation) / 2) * 0.20
                    confidence = round(0.40 + score_confidence, 2)

                submission["recommendation"] = {
                    "personality_type": ai_data.get("personality_type", ""),
                    "profile_title": ai_data.get("profile_title", ""),
                    "profile_body": ai_data.get("profile_body", ""),
                    "activity_explanations": ai_data.get("activity_explanations", []),
                    "recommendations": ai_data.get("recommendations", []),
                    "food_recommendations": ai_data.get("food_recommendations", []),
                    "food_recommendation_details": ai_data.get("food_recommendation_details", []),
                    "drink_recommendation": ai_data.get("drink_recommendation", ""),
                    "drink_recommendation_details": ai_data.get("drink_recommendation_details", {}),
                    "closing": ai_data.get("closing", ""),
                    "confidence_score": confidence,
                    "scores": {
                        "solo_social": solo_score,
                        "structured_freeform": structured_score,
                        "reasoning": ai_data.get("scoring_reasoning", ""),
                    },
                }
            elif ai_res.status_code == 404:
                logger.info(f"No AI results stored yet for {submission_id}")
            else:
                logger.warning(
                    f"AI atomic returned {ai_res.status_code} for {submission_id}: {ai_res.text}"
                )
    except httpx.TimeoutException:
        logger.warning(f"Timed out fetching AI results for {submission_id}")
    except httpx.RequestError as exc:
        logger.warning(f"Network error fetching AI results for {submission_id}: {exc}")
    except (KeyError, ValueError) as exc:
        logger.error(f"Malformed AI response for {submission_id}: {exc}")

    return submission


@app.get("/quiz/results/{submission_id}")
async def get_quiz_results(submission_id: str):
    """Fetch raw AI results for a submission directly from the AI atomic."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(f"{AI_URL}/quiz/results/{submission_id}")
    if res.status_code == 404:
        raise HTTPException(status_code=404, detail="Results not found")
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
        for name, url in [("quiz", QUIZ_URL), ("ai_recommendation", AI_URL)]:
            try:
                res = await client.get(f"{url}/health", timeout=3.0)
                results[name] = res.json()
            except Exception as exc:
                results[name] = {"status": "unreachable", "error": str(exc)}
    return results
