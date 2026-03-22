from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import OrderItem, QuantityUpdate 
from supabase import create_client, Client
from datetime import datetime

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

@app.get("/")
def home():
    return {"message": "Food Order Service is running"}

@app.post("/food-order")
async def create_order(order: OrderItem):
    # check if same item + same comment
    res = supabase.table("food_orders") \
        .select("*") \
        .eq("menu_item_id", order.menu_item_id) \
        .eq("comment", order.comment) \
        .eq("status", "pending") \
        .execute()

    if res.data:
        # update quantity instead of creating new order
        existing = res.data[0]
        new_quantity = existing["quantity"] + order.quantity
        new_total = existing["price"] * new_quantity

        updated = supabase.table("food_orders") \
            .update({"quantity": new_quantity, "total": new_total}) \
            .eq("order_id", existing["order_id"]) \
            .execute()

        return {"success": True, "message": "Order updated!", "order": updated.data[0]}

    # create new order in supabase
    new_order = {
        "menu_item_id": order.menu_item_id,
        "name": order.name,
        "price": order.price,
        "quantity": order.quantity,
        "comment": order.comment,
        "image_url": order.image_url,
        "total": order.price * order.quantity,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
    }

    res = supabase.table("food_orders").insert(new_order).execute()
    return {"success": True, "message": "Order placed!", "order": res.data[0]}

@app.get("/food-order/all")
async def get_all_orders():
    res = supabase.table("food_orders").select("*").execute()  
    return {"success": True, "orders": res.data}

@app.get("/food-order/{order_id}")
async def get_order(order_id: int):
    res = supabase.table("food_orders").select("*").eq("order_id", order_id).execute() 
    if not res.data:
        return {"success": False, "message": "Order not found"}
    return {"success": True, "order": res.data[0]}

@app.put("/food-order/{order_id}/status")
async def update_status(order_id: int, status: str):
    res = supabase.table("food_orders") \
        .update({"status": status}) \
        .eq("order_id", order_id) \
        .execute()  
    if not res.data:
        return {"success": False, "message": "Order not found"}
    return {"success": True, "order": res.data[0]}

@app.put("/food-order/{order_id}/quantity")
async def update_quantity(order_id: int, body: QuantityUpdate):
    # get current price first
    existing = supabase.table("food_orders").select("price").eq("order_id", order_id).execute()
    if not existing.data:
        return {"success": False, "message": "Order not found"}

    price = existing.data[0]["price"]
    new_total = price * body.quantity

    res = supabase.table("food_orders") \
        .update({"quantity": body.quantity, "total": new_total}) \
        .eq("order_id", order_id) \
        .execute() 
    return {"success": True, "order": res.data[0]}

@app.delete("/food-order/{order_id}")
async def delete_order(order_id: int):
    supabase.table("food_orders").delete().eq("order_id", order_id).execute()  
    return {"success": True, "message": "Order deleted"}
