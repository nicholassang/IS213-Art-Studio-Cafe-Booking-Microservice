from fastapi import FastAPI, Request, Body, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

# the composite service is also hit directly from the browser when you run
# services with Docker (the gateway sometimes fails or you may open the URL
# manually), so we need CORS here as well.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CALENDAR_URL = "http://calendar-service:8000"
ACTIVITY_URL = "http://activity-service:8000"
MENU_URL = "http://menu-service:8000" 
FOOD_ORDER_URL = "http://foodorder-service:8000"


@app.get("/calendar-url")
async def get_bookings():
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{CALENDAR_URL}/calendar-url")
    return res.json()

#Activities link to activity service(atomic service)
@app.get("/activities")
async def get_activities():
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{ACTIVITY_URL}/getAllActivities")
    return res.json()

@app.get("/activities/category/{category}")
async def get_by_category(category: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{ACTIVITY_URL}/activities/category/{category}")
    return res.json()

@app.get("/activities/{activity_id}")
async def get_activity(activity_id: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{ACTIVITY_URL}/activities/{activity_id}")
    return res.json()

#Menu link to menu service(atomic service)
@app.get("/menu")
async def get_menu():
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{MENU_URL}/menu/all")
    return res.json()

@app.get("/menu/name/{name}")
async def get_menu_by_name(name: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{MENU_URL}/menu/name/{name}")
    return res.json()

@app.get("/menu/{item_id}")
async def get_menu_item(item_id: int):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{MENU_URL}/menu/{item_id}")
    return res.json()

@app.get("/menu/category/{category}")
async def get_menu_by_category(category: str):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{MENU_URL}/menu/category/{category}")
    return res.json()

#Foodorder - link to foodOrder-service(atomic service)
@app.post("/food-order")
async def create_food_order(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{FOOD_ORDER_URL}/food-order", json=body)
    return res.json()

@app.get("/food-order/all")
async def get_all_food_orders():
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{FOOD_ORDER_URL}/food-order/all")
    return res.json()

@app.get("/food-order/{order_id}")
async def get_food_order(order_id: int):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{FOOD_ORDER_URL}/food-order/{order_id}")
    return res.json()

@app.put("/food-order/{order_id}/quantity")
async def update_food_order_quantity(order_id: int, request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.put(f"{FOOD_ORDER_URL}/food-order/{order_id}/quantity", json=body)
    return res.json()

@app.delete("/food-order/{order_id}")
async def delete_food_order(order_id: int):
    async with httpx.AsyncClient() as client:
        res = await client.delete(f"{FOOD_ORDER_URL}/food-order/{order_id}")
    return res.json()


