from fastapi import FastAPI, Body
from pydantic import BaseModel

app = FastAPI()

# In-memory store for orders
orders = []

class FoodOrder(BaseModel):
    startTime: str
    endTime: str
    numPeople: int
    orderDetails: list[str] = ["snacks", "drinks"]  
@app.post("/order")
async def create_food_order(order: FoodOrder):
    orders.append(order.dict())
    return {"success": True, "order": order.dict()}

@app.get("/orders")
async def get_orders():
    return {"orders": orders}