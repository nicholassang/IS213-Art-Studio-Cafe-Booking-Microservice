from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173","http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COMPOSITE_URL = os.getenv("COMPOSITE_URL", "http://composite-service:8000")
USER_URL = "http://user-service:8000"    # User Service called directly from API gateway, we make it have its own composite if needed
AI_RECOMMENDER_COMPOSITE_URL = os.getenv("AI_RECOMMENDER_COMPOSITE_URL", "http://ai-recommender-composite-service:8000")


from fastapi.responses import JSONResponse

@app.post("/register")
async def register(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{USER_URL}/register", json=data)
        headers = {}
        if res.headers.get("set-cookie"):
            headers["set-cookie"] = res.headers.get("set-cookie")
        return JSONResponse(status_code=res.status_code, content=res.json(), headers=headers or None)
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.post("/login")
async def login(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{USER_URL}/login", json=data, cookies=request.cookies)
        headers = {}
        if res.headers.get("set-cookie"):
            headers["set-cookie"] = res.headers.get("set-cookie")
        return JSONResponse(status_code=res.status_code, content=res.json(), headers=headers or None)
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.get("/profile")
async def profile(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{USER_URL}/profile", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.post("/logout")
async def logout(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{USER_URL}/logout", cookies=request.cookies)
        headers = {}
        if res.headers.get("set-cookie"):
            headers["set-cookie"] = res.headers.get("set-cookie")
        return JSONResponse(status_code=res.status_code, content=res.json(), headers=headers or None)
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})


@app.get("/calendar-url")
async def get_calendar_url(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{COMPOSITE_URL}/calendar-url", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.get("/getAllActivities")
async def get_all_activities(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{COMPOSITE_URL}/activities", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

# ---------------------------------------------------------------------------
# AI Recommender Composite routes
# ---------------------------------------------------------------------------
 
@app.get("/quiz/questions")
async def get_quiz_questions(request: Request, category: str = None):
    params = {"category": category} if category else {}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/questions", params=params, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.get("/quiz/questions/{question_id}")
async def get_quiz_question(question_id: str, request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/questions/{question_id}", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.post("/quiz/submit")
async def submit_quiz(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/submit", json=data, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.get("/quiz/submissions")
async def list_quiz_submissions(request: Request, user_id: str = None):
    params = {"user_id": user_id} if user_id else {}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/submissions", params=params, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.get("/quiz/submissions/user/{user_id}")
async def get_user_quiz_submission(user_id: str, request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/submissions/user/{user_id}", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.get("/quiz/submissions/{submission_id}")
async def get_quiz_submission(submission_id: str, request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/submissions/{submission_id}", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.put("/quiz/submissions/{submission_id}")
async def update_quiz_submission(submission_id: str, request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.put(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/submissions/{submission_id}", json=data, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.delete("/quiz/submissions/{submission_id}")
async def delete_quiz_submission(submission_id: str, request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.delete(f"{AI_RECOMMENDER_COMPOSITE_URL}/quiz/submissions/{submission_id}", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=None)
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.post("/recommend/submit")
async def recommend_and_submit(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{AI_RECOMMENDER_COMPOSITE_URL}/recommend/submit", json=data, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
 
 
@app.post("/recommend/preview")
async def preview_recommendation(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{AI_RECOMMENDER_COMPOSITE_URL}/recommend/preview", json=data, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})