from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Supabase connection
SUPABASE_URL = "https://blgtzrznellrbuptcogs.supabase.co"  
SUPABASE_KEY = "sb_publishable_VabQeIqtF9gGYouJFlyYhA_MaUdg9L7"                      
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Health check
@app.get("/")
def home():
    return {"message": "Food Menu Service is running"}

# Get all menu
@app.get("/menu/all")
def get_menu():
    res = supabase.table("menu_items").select("*").execute()
    return {"menu": res.data}

# Get single item by name
@app.get("/menu/name/{name}")
def get_item_by_name(name: str):
    formatted = name.replace("-", " ").title()
    res = supabase.table("menu_items").select("*").ilike("name", formatted).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return res.data[0]

# Get single item by id
@app.get("/menu/{item_id}")
def get_item(item_id: int):
    res = supabase.table("menu_items").select("*").eq("id", item_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return res.data[0]

# Filter by category
@app.get("/menu/category/{category}")
def get_by_category(category: str):
    res = supabase.table("menu_items").select("*").ilike("category", category).execute()
    return {"menu": res.data}