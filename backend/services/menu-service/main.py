from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Allow frontend later to access this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Mock database
menu_items = [
    {
        "id": 1,
        "name": "Avocado Toast",
        "category": "Main Meal",
        "description": "Toasted sourdough with smashed avocado and poached egg",
        "price": 12.0,
        "image_url": "http://localhost:8000/static/images/avocado_toast.jpg"
    },
    {
        "id": 2,
        "name": "Beef Lasagne",
        "category": "Main Meal",
        "description": "Slow cooked beef lasagne with rich tomato sauce",
        "price": 16.0,
        "image_url": "http://localhost:8000/static/images/beef_lasagne.jpg"
    },
    {
        "id": 3,
        "name": "Chocolate Lava Cake",
        "category": "Dessert",
        "description": "Warm chocolate cake with molten center",
        "price": 8.0,
        "image_url": "http://localhost:8000/static/images/chocolate_lava_cake.jpg"
    },
    {
        "id": 4,
        "name": "Tiramisu",
        "category": "Cake",
        "description": "Classic Italian dessert with mascarpone and espresso",
        "price": 7.0,
        "image_url": "http://localhost:8000/static/images/tiramisu.jpg"
    },
    {
        "id": 5,
        "name": "Iced Latte",
        "category": "Drink",
        "description": "Chilled espresso with milk over ice",
        "price": 5.5,
        "image_url": "http://localhost:8000/static/images/iced_latte.jpg"
    },
    {
        "id": 6,
        "name": "Mango Smoothie",
        "category": "Drink",
        "description": "Fresh blended mango with yogurt and honey",
        "price": 6.0,
        "image_url": "http://localhost:8000/static/images/mango_smoothie.jpg"
    }
]

# Health check
@app.get("/")
def home():
    return {"message": "Food Menu Service is running"}

# Get all menu
@app.get("/menu/all")
def get_menu():
    return {"menu": menu_items}

# Get single item
@app.get("/menu/{item_id}")
def get_item(item_id: int):
    for item in menu_items:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

# Filter by category
@app.get("/menu/category/{category}")
def get_by_category(category: str):
    filtered = [
        m for m in menu_items 
        if m["category"].lower() == category.lower()
    ]
    return {"menu": filtered}