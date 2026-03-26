from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

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