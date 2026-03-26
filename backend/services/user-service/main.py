from fastapi import FastAPI, Request
from starlette.middleware.sessions import SessionMiddleware
from passlib.context import CryptContext
from models import AuthModel
from supabase import create_client, Client

app = FastAPI()

# Supabase connection
SUPABASE_URL = "https://blgtzrznellrbuptcogs.supabase.co"
SUPABASE_KEY = "sb_publishable_VabQeIqtF9gGYouJFlyYhA_MaUdg9L7"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Allow session cookie over HTTP (local dev) and cross-site requests
app.add_middleware(
    SessionMiddleware,
    secret_key="supersecret123",
    https_only=False,
    # localhost frontend/backend are same-site across ports; Lax works on HTTP dev.
    # SameSite=None typically requires Secure and can be rejected by browsers on HTTP.
    same_site="lax",
)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_user_by_username(username: str):
    return (
        supabase.table("app_users")
        .select("id, username, email, password_hash")
        .eq("username", username)
        .limit(1)
        .execute()
    )

@app.post("/register")
async def register(request: Request, user: AuthModel):
    try:
        existing = get_user_by_username(user.username)
    except Exception:
        return {
            "success": False,
            "message": "Users table not found. Create table 'app_users' in Supabase first.",
        }

    if existing.data:
        return {"success": False, "message": "Username already exists"}

    password_hash = pwd_context.hash(user.password)
    insert_payload = {
        "username": user.username,
        "email": user.email,
        "password_hash": password_hash,
    }

    res = supabase.table("app_users").insert(insert_payload).execute()
    if not res.data:
        return {"success": False, "message": "Failed to create user"}

    request.session["user"] = user.username
    return {
        "success": True,
        "message": "Registered",
        "user": {
            "username": user.username,
            "email": user.email,
        },
    }

@app.post("/login")
async def login(request: Request, user: AuthModel):
    try:
        res = get_user_by_username(user.username)
    except Exception:
        return {
            "success": False,
            "message": "Users table not found. Create table 'app_users' in Supabase first.",
        }

    db_user = res.data[0] if res.data else None

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

    try:
        res = get_user_by_username(user)
    except Exception:
        return {"success": False}

    db_user = res.data[0] if res.data else None
    if not db_user:
        return {"success": False}

    return {
        "success": True,
        "username": db_user.get("username"),
        "email": db_user.get("email"),
    }