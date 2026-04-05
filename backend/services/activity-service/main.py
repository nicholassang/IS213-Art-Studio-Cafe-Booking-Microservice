from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from psycopg import connect
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
import os
import re

app = FastAPI()

# Allow frontend later to access this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BOOKINGS_PER_SLOT = 20
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required for activity-service")

class SaveActivityRequest(BaseModel):
    user_name: str
    activity_id: str


ACTIVITY_COLUMNS = """
    id,
    name,
    category,
    description,
    price,
    duration,
    image,
    rating,
    reviews,
    level,
    what_to_expect,
    session_flow,
    after_session
"""

BOOKING_COLUMNS = """
    id,
    activity_id,
    user_name,
    created_at,
    user_email,
    activity_name,
    start_time,
    end_time,
    food_orders,
    total_amount,
    status,
    payment,
    additional_notes
"""


def fetch_all(query: str, params: tuple = ()):
    with connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()


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


def execute_write_all(query: str, params: tuple = ()):
    with connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
        conn.commit()
    return rows


def normalize_timestamp_param(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    # Query strings may decode '+' into a space, e.g. 2026-03-30T00:00:00 00.
    match = re.match(r"^(.*T\d{2}:\d{2}:\d{2}(?:\.\d+)?) (\d{2}(?::?\d{2})?)$", value)
    if match:
        return f"{match.group(1)}+{match.group(2)}"

    return value


def get_slot_booking_count(start_time: str, end_time: str, activity_id: Optional[str] = None) -> int:
    start_time = normalize_timestamp_param(start_time)
    end_time = normalize_timestamp_param(end_time)

    if activity_id is None:
        row = fetch_one(
            """
            SELECT COUNT(*) AS booking_count
            FROM bookings
            WHERE start_time = %s
              AND end_time = %s
              AND status <> 'cancelled'
            """,
            (start_time, end_time),
        )
    else:
        row = fetch_one(
            """
            SELECT COUNT(*) AS booking_count
            FROM bookings
            WHERE start_time = %s
              AND end_time = %s
              AND activity_id = %s
              AND status <> 'cancelled'
            """,
            (start_time, end_time, str(activity_id)),
        )

    return int((row or {}).get("booking_count", 0))

# Health check
@app.get("/")
def home():
    return {"message": "Activity Service is running", "storage": "postgres"}

@app.get("/activities")
def get_activities():
    activities = fetch_all(f"SELECT {ACTIVITY_COLUMNS} FROM activities ORDER BY id")
    return {"activities": activities}


@app.get("/activities/category/{category}")
def get_by_category(category: str):
    activities = fetch_all(
        f"SELECT {ACTIVITY_COLUMNS} FROM activities WHERE category ILIKE %s ORDER BY id",
        (category,),
    )
    return {"activities": activities}


@app.get("/activities/{activity_id}")
def get_activity(activity_id: str):
    activity = fetch_one(
        f"SELECT {ACTIVITY_COLUMNS} FROM activities WHERE id = %s LIMIT 1",
        (activity_id,),
    )

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    return activity

@app.post("/bookings")
def create_booking(payload: dict):
    start_time = payload.get("start_time")
    end_time = payload.get("end_time")
    activity_id = payload.get("activity_id")

    if not activity_id:
        raise HTTPException(status_code=400, detail="activity_id is required")

    if start_time and end_time:
        booked_slots = get_slot_booking_count(start_time, end_time, activity_id)
        if booked_slots >= MAX_BOOKINGS_PER_SLOT:
            raise HTTPException(status_code=409, detail="Selected slot is fully booked")

    booking = execute_write(
        f"""
        INSERT INTO bookings (
            user_name,
            user_email,
            activity_id,
            activity_name,
            start_time,
            end_time,
            food_orders,
            total_amount,
            status,
            payment,
            additional_notes
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING {BOOKING_COLUMNS}
        """,
        (
            payload.get("user_name"),
            payload.get("user_email"),
            payload.get("activity_id"),
            payload.get("activity_name"),
            payload.get("start_time"),
            payload.get("end_time"),
            Jsonb(payload.get("food_orders")) if payload.get("food_orders") is not None else None,
            payload.get("total_amount"),
            payload.get("status", "confirmed"),
            Jsonb(payload.get("payment")) if payload.get("payment") is not None else None,
            payload.get("additional_notes", ""),
        ),
    )

    return {
        "success": True,
        "booking": booking,
        "omitted_columns": [],
    }


@app.get("/bookings/availability")
def get_booking_availability(start_time: str, end_time: str, activity_id: str):
    booked_slots = get_slot_booking_count(start_time, end_time, activity_id)
    remaining_slots = max(MAX_BOOKINGS_PER_SLOT - booked_slots, 0)

    return {
        "activity_id": activity_id,
        "start_time": start_time,
        "end_time": end_time,
        "max_slots": MAX_BOOKINGS_PER_SLOT,
        "booked_slots": booked_slots,
        "remaining_slots": remaining_slots,
        "is_full": remaining_slots == 0,
    }


@app.get("/bookings")
def list_bookings(user_name: Optional[str] = None):
    if user_name:
        bookings = fetch_all(
            f"""
            SELECT {BOOKING_COLUMNS}
            FROM bookings
            WHERE user_name = %s
            ORDER BY start_time DESC NULLS LAST, id DESC
            """,
            (user_name,),
        )
    else:
        bookings = fetch_all(
            f"SELECT {BOOKING_COLUMNS} FROM bookings ORDER BY start_time DESC NULLS LAST, id DESC"
        )

    return {"success": True, "bookings": bookings}

# Save an activity
@app.post("/saved-activities")
def save_activity(payload: SaveActivityRequest):
    existing = fetch_one(
        "SELECT id, user_name, activity_id, created_at FROM saved_activities WHERE user_name = %s AND activity_id = %s LIMIT 1",
        (payload.user_name, payload.activity_id),
    )

    if existing:
        return {
            "message": "Activity already saved",
            "saved": True
        }

    saved_row = execute_write(
        """
        INSERT INTO saved_activities (user_name, activity_id)
        VALUES (%s, %s)
        RETURNING id, user_name, activity_id, created_at
        """,
        (payload.user_name, payload.activity_id),
    )

    return {
        "message": "Activity saved successfully",
        "saved": True,
        "data": [saved_row] if saved_row else []
    }

# Remove a saved activity
@app.delete("/saved-activities/{user_name}/{activity_id}")
def unsave_activity(user_name: str, activity_id: str):
    deleted = execute_write(
        "DELETE FROM saved_activities WHERE user_name = %s AND activity_id = %s RETURNING id",
        (user_name, activity_id),
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Saved activity not found")

    return {
        "message": "Activity removed from saved list",
        "saved": False
    }

# Check if one activity is saved
@app.get("/saved-activities/{user_name}/{activity_id}")
def check_saved_activity(user_name: str, activity_id: str):
    saved_activity = fetch_one(
        "SELECT id FROM saved_activities WHERE user_name = %s AND activity_id = %s LIMIT 1",
        (user_name, activity_id),
    )

    return {
        "saved": bool(saved_activity)
    }

# Get all saved rows for a user
@app.get("/saved-activities/{user_name}")
def get_saved_activities(user_name: str):
    saved_rows = fetch_all(
        "SELECT id, user_name, activity_id, created_at FROM saved_activities WHERE user_name = %s ORDER BY created_at DESC",
        (user_name,),
    )

    return {"saved_activities": saved_rows}

# Get full saved activity details for a user
@app.get("/saved-experiences/{user_name}")
def get_saved_experiences(user_name: str):
    activities = fetch_all(
        f"""
        SELECT a.{ACTIVITY_COLUMNS}
        FROM activities a
        INNER JOIN saved_activities s ON s.activity_id = a.id
        WHERE s.user_name = %s
        ORDER BY s.created_at DESC
        """,
        (user_name,),
    )

    return {"activities": activities}
