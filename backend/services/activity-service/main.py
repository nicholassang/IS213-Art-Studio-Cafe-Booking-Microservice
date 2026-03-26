from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from supabase import create_client
from postgrest.exceptions import APIError
from pydantic import BaseModel
import re

# Initialize Supabase client
SUPABASE_URL = "https://blgtzrznellrbuptcogs.supabase.co"
SUPABASE_KEY = "sb_publishable_VabQeIqtF9gGYouJFlyYhA_MaUdg9L7"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.mount("/images", StaticFiles(directory="images"), name="images")

# Allow frontend later to access this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SaveActivityRequest(BaseModel):
    user_name: str
    activity_id: str

# Health check
@app.get("/")
def home():
    return {"message": "Activity Service is running"}

# Access using Supabase
@app.get("/getAllActivities")
def get_activities():
    response = supabase.table("activities").select("*").execute()
    return {"activities": response.data}


@app.post("/bookings")
def create_booking(payload: dict):
    # Store full booking record: user info, activity, time slot, food orders, payment
    booking_payload = {
        "user_name": payload.get("user_name"),
        "user_email": payload.get("user_email"),
        "activity_id": payload.get("activity_id"),
        "activity_name": payload.get("activity_name"),
        "start_time": payload.get("start_time"),
        "end_time": payload.get("end_time"),
        "food_orders": payload.get("food_orders"),     # jsonb: list of ordered items
        "total_amount": payload.get("total_amount"),
        "status": payload.get("status", "confirmed"),
        "payment": payload.get("payment"),             # jsonb: transaction_id, method, status
        "additional_notes": payload.get("additional_notes", ""),
    }

    # Keep insertion compatible with older schemas by dropping unknown columns one by one.
    insert_payload = {k: v for k, v in booking_payload.items() if v is not None}
    omitted_columns = []

    while True:
        try:
            response = supabase.table("bookings").insert(insert_payload).execute()
            break
        except APIError as exc:
            message = str(exc)
            if "PGRST204" not in message:
                raise HTTPException(status_code=500, detail=message)

            match = re.search(r"'([^']+)' column", message)
            if not match:
                raise HTTPException(status_code=500, detail=message)

            missing_col = match.group(1)
            if missing_col not in insert_payload:
                raise HTTPException(status_code=500, detail=message)

            omitted_columns.append(missing_col)
            insert_payload.pop(missing_col, None)

            if not insert_payload:
                raise HTTPException(status_code=500, detail="No compatible columns found for bookings table")

    return {
        "success": True,
        "booking": response.data[0] if response.data else None,
        "omitted_columns": omitted_columns,
    }


@app.get("/bookings")
def list_bookings():
    response = supabase.table("bookings").select("*").execute()
    return {"success": True, "bookings": response.data}

# Get single activity (details page)
@app.get("/activities/{activity_id}")
def get_activity(activity_id: str):
    response = supabase.table("activities") \
        .select("*") \
        .eq("id", activity_id) \
        .execute()

    if response.data:
        return response.data[0]

    raise HTTPException(status_code=404, detail="Activity not found")

# Filter by category
@app.get("/activities/category/{category}")
def get_by_category(category: str):
    response = supabase.table("activities") \
        .select("*") \
        .ilike("category", category) \
        .execute()

    return {"activities": response.data}

# Save an activity
@app.post("/saved-activities")
def save_activity(payload: SaveActivityRequest):
    try:
        existing = supabase.table("saved_activities") \
            .select("*") \
            .eq("user_name", payload.user_name) \
            .eq("activity_id", payload.activity_id) \
            .execute()
    except APIError as exc:
        raise HTTPException(status_code=500, detail=exc.message)

    if existing.data:
        return {
            "message": "Activity already saved",
            "saved": True
        }

    try:
        response = supabase.table("saved_activities") \
            .insert({
                "user_name": payload.user_name,
                "activity_id": payload.activity_id
            }) \
            .execute()
    except APIError as exc:
        raise HTTPException(status_code=500, detail=exc.message)

    return {
        "message": "Activity saved successfully",
        "saved": True,
        "data": response.data
    }

# Remove a saved activity
@app.delete("/saved-activities/{user_name}/{activity_id}")
def unsave_activity(user_name: str, activity_id: str):
    existing = supabase.table("saved_activities") \
        .select("*") \
        .eq("user_name", user_name) \
        .eq("activity_id", activity_id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Saved activity not found")

    supabase.table("saved_activities") \
        .delete() \
        .eq("user_name", user_name) \
        .eq("activity_id", activity_id) \
        .execute()

    return {
        "message": "Activity removed from saved list",
        "saved": False
    }

# Check if one activity is saved
@app.get("/saved-activities/{user_name}/{activity_id}")
def check_saved_activity(user_name: str, activity_id: str):
    response = supabase.table("saved_activities") \
        .select("*") \
        .eq("user_name", user_name) \
        .eq("activity_id", activity_id) \
        .execute()

    return {
        "saved": len(response.data or []) > 0
    }

# Get all saved rows for a user
@app.get("/saved-activities/{user_name}")
def get_saved_activities(user_name: str):
    response = supabase.table("saved_activities") \
        .select("*") \
        .eq("user_name", user_name) \
        .execute()

    return {"saved_activities": response.data or []}

# Get full saved activity details for a user
@app.get("/saved-experiences/{user_name}")
def get_saved_experiences(user_name: str):
    saved_response = supabase.table("saved_activities") \
        .select("activity_id") \
        .eq("user_name", user_name) \
        .execute()

    saved_rows = saved_response.data or []
    activity_ids = [row["activity_id"] for row in saved_rows]

    if not activity_ids:
        return {"activities": []}

    activities_response = supabase.table("activities") \
        .select("*") \
        .in_("id", activity_ids) \
        .execute()

    return {"activities": activities_response.data or []}
