from fastapi import FastAPI, Request, Response, Body
from starlette.middleware.sessions import SessionMiddleware
from passlib.context import CryptContext
from models import AuthModel

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key="supersecret123")

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

users_db = {"test": pwd_context.hash("test")} # pre-hash for testing; in production, store hashed passwords only

@app.post("/register")
async def register(request: Request, user: AuthModel):
    if user.username in users_db:
        return {"success": False, "message": "Username already exists"}

    users_db[user.username] = pwd_context.hash(user.password)
    request.session["user"] = user.username
    return {"success": True, "message": "Registered"}

@app.post("/login")
async def login(request: Request, user: AuthModel):
    db_user = users_db.get(user.username)

    if not db_user or not pwd_context.verify(user.password, db_user):
        return {"success": False, "message": "Invalid credentials"}

    request.session["user"] = user.username
    return {"success": True, "message": "Logged in"}

@app.post("/logout")
async def logout(request: Request):
    request.session.pop("user", None)
    return {"success": True}

@app.get("/profile")
async def profile(request: Request):
    user = request.session.get("user")
    if not user:
        return {"success": False}

    return {"success": True, "username": user}