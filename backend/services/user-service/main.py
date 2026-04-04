from fastapi import FastAPI, Request
from starlette.middleware.sessions import SessionMiddleware
from passlib.context import CryptContext
from models import AuthModel
from psycopg import connect
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL")
SESSION_SECRET = os.getenv("SESSION_SECRET", "supersecret123")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required for user-service")


USER_COLUMNS = "id, username, email, password_hash, created_at"


def fetch_one(query: str, params: tuple = ()):
    with connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchone()


def execute_write(query: str, params: tuple = ()):
    with connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
        conn.commit()
    return row

# Allow session cookie over HTTP (local dev) and cross-site requests
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    https_only=False,
    # localhost frontend/backend are same-site across ports; Lax works on HTTP dev.
    # SameSite=None typically requires Secure and can be rejected by browsers on HTTP.
    same_site="lax",
)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_user_by_username(username: str):
    return fetch_one(
        f"SELECT {USER_COLUMNS} FROM app_users WHERE username = %s LIMIT 1",
        (username,),
    )

@app.post("/register")
async def register(request: Request, user: AuthModel):
    existing = get_user_by_username(user.username)
    if existing:
        return {"success": False, "message": "Username already exists"}

    password_hash = pwd_context.hash(user.password)

    try:
        created_user = execute_write(
            f"""
            INSERT INTO app_users (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING {USER_COLUMNS}
            """,
            (user.username, user.email, password_hash),
        )
    except UniqueViolation:
        return {"success": False, "message": "Username or email already exists"}

    request.session["user"] = user.username
    return {
        "success": True,
        "message": "Registered",
        "user": {
            "username": created_user.get("username"),
            "email": created_user.get("email"),
        },
    }

@app.post("/login")
async def login(request: Request, user: AuthModel):
    db_user = get_user_by_username(user.username)

    if not db_user or not pwd_context.verify(user.password, db_user["password_hash"]):
        return {"success": False, "message": "Invalid credentials"}

    request.session["user"] = user.username
    return {
        "success": True,
        "message": "Logged in",
        "user": {
            "username": db_user.get("username"),
            "email": db_user.get("email"),
        },
    }

@app.post("/logout")
async def logout(request: Request):
    request.session.pop("user", None)
    return {"success": True}

@app.get("/profile")
async def profile(request: Request):
    user = request.session.get("user")
    if not user:
        return {"success": False}

    db_user = get_user_by_username(user)
    if not db_user:
        return {"success": False}

    return {
        "success": True,
        "username": db_user.get("username"),
        "email": db_user.get("email"),
    }