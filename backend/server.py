from fastapi import FastAPI, Request, Body, Response
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from passlib.context import CryptContext

# --------------------------
# Data models
# --------------------------
class Booking(BaseModel):
    startTime: str
    endTime: str
    numPeople: int = Field(..., gt=0)

class AuthModel(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4, max_length=128)  # limit to avoid huge inputs

# --------------------------
# App setup
# --------------------------
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sessions
app.add_middleware(SessionMiddleware, secret_key="supersecret123")

# --------------------------
# Password hashing using Argon2
# --------------------------
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# --------------------------
# In-memory storage
# --------------------------
bookings = []
users_db = {"test" : pwd_context.hash("test")}  # pre-hash for testing; in production, store hashed passwords only

# --------------------------
# Routes
# --------------------------

@app.post("/register")
async def register(request: Request, response: Response, user: AuthModel = Body(...)):
    if user.username in users_db:
        return {"success": False, "message": "Username already exists"}
    
    hashed = pwd_context.hash(user.password)
    users_db[user.username] = hashed
    
    # persist username in the session store managed by SessionMiddleware
    request.session["user"] = user.username
    
    response.set_cookie(
        key="session",
        value=user.username,
        httponly=True,
        samesite="none",  # allow cross-site fetches
        path="/",
        secure=False,      # set to True when you have HTTPS
    )
    return {"success": True, "message": "Registered"}

@app.post("/login")
async def login(request: Request, response: Response, user: AuthModel = Body(...)):
    db_user = users_db.get(user.username)
    if not db_user or not pwd_context.verify(user.password, db_user):
        return {"success": False, "message": "Invalid credentials"}
    
    # update server-side session
    request.session["user"] = user.username
    
    response.set_cookie(
        key="session",
        value=user.username,
        httponly=True,
        samesite="none",  # allow cross-site fetches
        path="/",
        secure=False,
    )
    return {"success": True, "message": "Logged in successfully"}

@app.post("/logout")
async def logout(request: Request, response: Response):
    # clear the value from the server-side session store as well
    request.session.pop("user", None)
    response.delete_cookie(
        key="session",
        path="/",
        samesite="none",
    )
    return {"success": True, "message": "Logged out"}

@app.get("/profile")
async def profile(request: Request):
    # prefer the middleware-managed session dict; cookies may be unsigned
    session_user = request.session.get("user") or request.cookies.get("session")
    if not session_user:
        return {"success": False, "message": "Not authenticated"}
    return {"success": True, "username": session_user}

# --------------------------
# Booking endpoints
# --------------------------
@app.post("/bookings")
async def create_booking(booking: Booking):
    bookings.append(booking.model_dump())
    return {"success": True, "booking": booking.model_dump()}

@app.get("/bookings")
async def get_bookings():
    return {"bookings": bookings}   