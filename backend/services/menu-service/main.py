from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from psycopg import connect
from psycopg.rows import dict_row
import os

load_dotenv()

app = FastAPI()

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

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required for menu-service")


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

# Health check
@app.get("/")
def home():
    return {"message": "Food Menu Service is running", "storage": "postgres"}

# Get all menu
@app.get("/menu/all")
def get_menu():
    items = fetch_all("SELECT * FROM menu_items ORDER BY id")
    return {"menu": items}

# Get single item by name
@app.get("/menu/name/{name}")
def get_item_by_name(name: str):
    formatted = name.replace("-", " ").title()
    item = fetch_one(
        "SELECT * FROM menu_items WHERE name ILIKE %s LIMIT 1",
        (formatted,),
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

# Get single item by id
@app.get("/menu/{item_id}")
def get_item(item_id: int):
    item = fetch_one(
        "SELECT * FROM menu_items WHERE id = %s LIMIT 1",
        (item_id,),
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

# Filter by category
@app.get("/menu/category/{category}")
def get_by_category(category: str):
    items = fetch_all(
        "SELECT * FROM menu_items WHERE category ILIKE %s ORDER BY id",
        (category,),
    )
    return {"menu": items}