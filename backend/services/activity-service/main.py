from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

# Mock database (Activity catalogue)
activities = [
    {
        "id": "art-jamming",
        "name": "Art Jamming",
        "category": "Painting",
        "description": "Express your creativity on canvas with guidance.",
        "price": 45,
        "duration": "2 hours",
        "image": "http://localhost:8000/images/art_jamming.jpg",
        "rating": 4.8,
        "reviews": 120,
        "level": "Beginner",
        "what_to_expect": [
            "Guided session by instructor",
            "All materials provided",
            "Take home artwork"
        ],
        "session_flow": [
            "Choose your canvas",
            "Follow guided steps",
            "Free painting time"
        ],
        "after_session": [
            "Dry your artwork",
            "Take photos",
            "Bring home your creation"
        ]
    },
    {
        "id": "oil-painting",
        "name": "Oil Painting",
        "category": "Painting",
        "description": "Learn oil painting techniques with professionals.",
        "price": 60,
        "duration": "3 hours",
        "image": "http://localhost:8000/images/oil_painting.jpg",
        "rating": 4.7,
        "reviews": 95,
        "level": "Intermediate",

        "what_to_expect": [
            "Learn oil blending techniques",
            "Step-by-step guidance",
            "Premium materials included"
        ],
        "session_flow": [
            "Introduction to oil paints",
            "Guided painting session",
            "Free expression phase"
        ],
        "after_session": [
            "Artwork drying session",
            "Instructor feedback",
            "Take home your painting"
        ]
    },
    {
        "id": "acrylic-painting",
        "name": "Acrylic Painting",
        "category": "Painting",
        "description": "Fun and vibrant acrylic painting session.",
        "price": 40,
        "duration": "2 hours",
        "image": "http://localhost:8000/images/acrylic_painting.jpg",
        "rating": 4.6,
        "reviews": 80,
        "level": "Beginner",

        "what_to_expect": [
            "Explore acrylic colors",
            "Creative freedom",
            "All materials included"
        ],
        "session_flow": [
            "Introduction to acrylics",
            "Painting practice",
            "Final artwork"
        ],
        "after_session": [
            "Dry artwork",
            "Photo taking",
            "Take home your piece"
        ]
    },
    {
        "id": "clay-sculpting",
        "name": "Clay Sculpting",
        "category": "Sculpting",
        "description": "Create your own clay masterpiece.",
        "price": 50,
        "duration": "2.5 hours",
        "image": "http://localhost:8000/images/clay_sculpting.jpg",
        "rating": 4.9,
        "reviews": 60,
        "level": "All Levels",

        "what_to_expect": [
            "Hands-on clay sculpting",
            "Instructor guidance",
            "Create your own sculpture"
        ],
        "session_flow": [
            "Clay introduction",
            "Shaping techniques",
            "Final sculpting"
        ],
        "after_session": [
            "Drying process",
            "Optional glazing",
            "Collection later"
        ]
    },
    {
        "id": "watercolor-workshop",
        "name": "Watercolor Workshop",
        "category": "Painting",
        "description": "Relax with soft watercolor techniques.",
        "price": 35,
        "duration": "1.5 hours",
        "image": "http://localhost:8000/images/watercolor.jpg",
        "rating": 4.5,
        "reviews": 70,
        "level": "Beginner",

        "what_to_expect": [
            "Relaxing painting session",
            "Watercolor basics",
            "Guided artwork creation"
        ],
        "session_flow": [
            "Brush techniques",
            "Color blending",
            "Final piece"
        ],
        "after_session": [
            "Dry artwork",
            "Take home painting",
            "Share with friends"
        ]
    }
]

# Health check
@app.get("/")
def home():
    return {"message": "Activity Service is running"}

# Browse all activities (catalogue)
@app.get("/getAllActivities")
def get_activities():
    return {"activities": activities}

# Get single activity (details page)
@app.get("/activities/{activity_id}")
def get_activity(activity_id: str):
    for activity in activities:
        if activity["id"] == activity_id:
            return activity
    raise HTTPException(status_code=404, detail="Activity not found")

# Filter by category
@app.get("/activities/category/{category}")
def get_by_category(category: str):
    filtered = [a for a in activities if a["category"].lower() == category.lower()]
    return {"activities": filtered}