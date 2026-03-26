from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from supabase import create_client
from pydantic import BaseModel

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
    existing = supabase.table("saved_activities") \
        .select("*") \
        .eq("user_name", payload.user_name) \
        .eq("activity_id", payload.activity_id) \
        .execute()

    if existing.data:
        return {
            "message": "Activity already saved",
            "saved": True
        }

    response = supabase.table("saved_activities") \
        .insert({
            "user_name": payload.user_name,
            "activity_id": payload.activity_id
        }) \
        .execute()

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