from fastapi import FastAPI, Request, Form, Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from passlib.context import CryptContext

# --------------------------
# Data model for booking
# --------------------------
class Booking(BaseModel):
    startTime: str
    endTime: str
    numPeople: int

# --------------------------
# App setup
# --------------------------
app = FastAPI()

# Allow CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------
# In-memory storage
# --------------------------
bookings = []

# --------------------------
# Sessions
# --------------------------
app.add_middleware(SessionMiddleware, secret_key="supersecret123")

# --------------------------
# Password hashing
# --------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --------------------------
# In-memory "user database"
# --------------------------
users_db = {}

# --------------------------
# Routes
# --------------------------
@app.post("/bookings")
async def create_booking(booking: Booking):
    # Save to in-memory storage
    bookings.append(booking.model_dump())
    return {"success": True, "booking": booking.model_dump()}

@app.get("/bookings")
async def get_bookings():
    return {"bookings": bookings}

@app.post("/register")
async def register(
    response: Response,
    username: str = Form(...),
    password: str = Form(...)
):
    if username in users_db:
        return {"success": False, "message": "User already exists"}
    hashed = pwd_context.hash(password)
    users_db[username] = hashed
    # Set session cookie
    response.set_cookie(key="session", value=username, httponly=True)
    return {"success": True, "message": "Registered successfully"}

@app.post("/login")
async def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...)
):
    user = users_db.get(username)
    if not user or not pwd_context.verify(password, user):
        return {"success": False, "message": "Invalid credentials"}
    # Set session cookie
    response.set_cookie(key="session", value=username, httponly=True)
    return {"success": True, "message": "Logged in successfully"}

@app.post("/logout")
async def logout(response: Response):
    response.delete_cookie("session")
    return {"success": True, "message": "Logged out"}

@app.get("/profile")
async def profile(request: Request):
    session_user = request.cookies.get("session")
    if not session_user:
        return {"success": False, "message": "Not authenticated"}
    return {"success": True, "username": session_user}