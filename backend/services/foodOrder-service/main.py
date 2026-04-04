from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import OrderItem, QuantityUpdate
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
    raise RuntimeError("DATABASE_URL is required for foodorder-service")


ORDER_COLUMNS = """
    order_id,
    menu_item_id,
    name,
    price::float8 AS price,
    quantity,
    image_url,
    comment,
    total::float8 AS total,
    status,
    created_at
"""


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


def execute_write(query: str, params: tuple = ()):
    with connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
        conn.commit()
    return row

@app.get("/")
def home():
    return {"message": "Food Order Service is running", "storage": "postgres"}

@app.post("/food-order")
async def create_order(order: OrderItem):
    existing = fetch_one(
        f"SELECT {ORDER_COLUMNS} FROM food_orders WHERE menu_item_id = %s AND comment = %s AND status = 'pending' LIMIT 1",
        (order.menu_item_id, order.comment or ""),
    )

    if existing:
        # update quantity instead of creating new order
        new_quantity = existing["quantity"] + order.quantity
        new_total = existing["price"] * new_quantity

        updated = execute_write(
            f"UPDATE food_orders SET quantity = %s, total = %s WHERE order_id = %s RETURNING {ORDER_COLUMNS}",
            (new_quantity, new_total, existing["order_id"]),
        )

        return {"success": True, "message": "Order updated!", "order": updated}

    inserted = execute_write(
        f"""
        INSERT INTO food_orders (menu_item_id, name, price, quantity, comment, image_url, total, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
        RETURNING {ORDER_COLUMNS}
        """,
        (
            order.menu_item_id,
            order.name,
            order.price,
            order.quantity,
            order.comment or "",
            order.image_url or "",
            order.price * order.quantity,
        ),
    )
    return {"success": True, "message": "Order placed!", "order": inserted}

@app.get("/food-order/all")
async def get_all_orders():
    orders = fetch_all(f"SELECT {ORDER_COLUMNS} FROM food_orders ORDER BY order_id")
    return {"success": True, "orders": orders}

@app.get("/food-order/{order_id}")
async def get_order(order_id: int):
    order = fetch_one(
        f"SELECT {ORDER_COLUMNS} FROM food_orders WHERE order_id = %s LIMIT 1",
        (order_id,),
    )
    if not order:
        return {"success": False, "message": "Order not found"}
    return {"success": True, "order": order}

@app.put("/food-order/{order_id}/status")
async def update_status(order_id: int, status: str):
    order = execute_write(
        f"UPDATE food_orders SET status = %s WHERE order_id = %s RETURNING {ORDER_COLUMNS}",
        (status, order_id),
    )
    if not order:
        return {"success": False, "message": "Order not found"}
    return {"success": True, "order": order}

@app.put("/food-order/{order_id}/quantity")
async def update_quantity(order_id: int, body: QuantityUpdate):
    existing = fetch_one(
        "SELECT price::float8 AS price FROM food_orders WHERE order_id = %s LIMIT 1",
        (order_id,),
    )
    if not existing:
        return {"success": False, "message": "Order not found"}

    price = existing["price"]
    new_total = price * body.quantity

    order = execute_write(
        f"UPDATE food_orders SET quantity = %s, total = %s WHERE order_id = %s RETURNING {ORDER_COLUMNS}",
        (body.quantity, new_total, order_id),
    )
    return {"success": True, "order": order}

@app.delete("/food-order/{order_id}")
async def delete_order(order_id: int):
    execute_write(
        "DELETE FROM food_orders WHERE order_id = %s RETURNING order_id",
        (order_id,),
    )
    return {"success": True, "message": "Order deleted"}
