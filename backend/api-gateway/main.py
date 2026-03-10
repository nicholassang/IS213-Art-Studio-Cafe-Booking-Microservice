from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COMPOSITE_URL = os.getenv("COMPOSITE_URL", "http://composite-service:8000")

from fastapi.responses import JSONResponse

@app.post("/register")
async def register(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{COMPOSITE_URL}/register", json=data)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.post("/login")
async def login(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{COMPOSITE_URL}/login", json=data, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.get("/profile")
async def profile(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{COMPOSITE_URL}/profile", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.post("/logout")
async def logout(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{COMPOSITE_URL}/logout", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})


@app.post("/bookings")
async def create_booking(request: Request):
    data = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{COMPOSITE_URL}/bookings", json=data, cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})

@app.get("/bookings")
async def get_bookings(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{COMPOSITE_URL}/bookings", cookies=request.cookies)
        return JSONResponse(status_code=res.status_code, content=res.json())
    except httpx.RequestError as exc:
        return JSONResponse(status_code=502, content={"success": False, "message": str(exc)})
