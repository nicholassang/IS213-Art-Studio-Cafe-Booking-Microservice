from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from supabase import create_client

# Initialize Supabase client
SUPABASE_URL = "https://fdswggvfoewxvpofqcqj.supabase.co"
SUPABASE_KEY = "sb_publishable_epk29CAGgL3DYkXHOKmPPA_5CqBt4oI"

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
