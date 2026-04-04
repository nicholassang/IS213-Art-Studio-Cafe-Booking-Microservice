from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import aio_pika
import httpx
import json
import logging
import os
from pydantic import BaseModel, Field
from typing import List, Optional

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

ACTIVITY_URL = "http://activity-service:8000"
MENU_URL = "http://menu-service:8000" 
FOOD_ORDER_URL = "http://foodorder-service:8000"
PAYMENT_URL = os.getenv("PAYMENT_URL", "http://payment-wrapper:8000")
NOTIFICATION_URL = os.getenv("NOTIFICATION_URL", "http://notification-service:8000")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
BOOKING_EVENTS_EXCHANGE = "booking.events"
BOOKING_CONFIRMED_ROUTING_KEY = "booking.confirmed"
PAYMENT_CURRENCY = os.getenv("PAYMENT_CURRENCY", "sgd")
DEFAULT_PAYMENT_METHOD = os.getenv("DEFAULT_PAYMENT_METHOD", "pm_card_visa")

logger = logging.getLogger(__name__)


def to_minor_units(amount: float) -> int:
    return max(1, int(round(amount * 100)))


def normalize_payment_method(payment_method: Optional[str]) -> str:
    if not payment_method:
        return DEFAULT_PAYMENT_METHOD

    normalized = payment_method.strip().lower()
    generic_card_methods = {"card", "credit_card", "credit-card", "debit_card", "debit-card"}

    if normalized in generic_card_methods:
        return DEFAULT_PAYMENT_METHOD

    return payment_method


class FoodItem(BaseModel):
    id: int
    quantity: int = Field(..., gt=0)
    comment: Optional[str] = ""


class BookingRequest(BaseModel):
    user_name: str
    user_email: str
    activity_id: str
    start_time: str
    end_time: str
    food_items: List[FoodItem]
    payment_method: str = "card"
    additional_notes: Optional[str] = None


async def get_slot_availability(client: httpx.AsyncClient, start_time: str, end_time: str, activity_id: str) -> dict:
    params = {"start_time": start_time, "end_time": end_time, "activity_id": activity_id}

    availability_resp = await client.get(
        f"{ACTIVITY_URL}/bookings/availability",
        params=params,
    )

    if availability_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch slot availability")

    return availability_resp.json()


async def publish_booking_confirmation_event(event_payload: dict):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)

    try:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            BOOKING_EVENTS_EXCHANGE,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        message = aio_pika.Message(
            body=json.dumps(event_payload).encode("utf-8"),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=BOOKING_CONFIRMED_ROUTING_KEY)
    finally:
        await connection.close()


@app.post("/booking")
async def create_booking(payload: BookingRequest):
    async with httpx.AsyncClient() as client:
        # Validate activity selected first
        activity_resp = await client.get(f"{ACTIVITY_URL}/activities/{payload.activity_id}")
        if activity_resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Activity not found")

        activity = activity_resp.json()
        slot_availability = await get_slot_availability(client, payload.start_time, payload.end_time, payload.activity_id)
        if slot_availability.get("remaining_slots", 0) <= 0:
            raise HTTPException(status_code=409, detail="Selected slot is fully booked")

        # Validate requested food items and create food orders using food order service
        food_order_responses = []
        total_amount = 0.0

        for item in payload.food_items:
            menu_resp = await client.get(f"{MENU_URL}/menu/{item.id}")
            if menu_resp.status_code != 200:
                raise HTTPException(status_code=404, detail=f"Menu item {item.id} not found")

            menu_item = menu_resp.json()
            item_total = float(menu_item.get("price", 0)) * item.quantity
            total_amount += item_total

            order_payload = {
                "menu_item_id": item.id,
                "name": menu_item.get("name"),
                "price": float(menu_item.get("price", 0)),
                "quantity": item.quantity,
                # Include booking-scoped fallback comment so food orders are not merged across unrelated bookings.
                "comment": item.comment or f"booking:{payload.activity_id}:{payload.start_time}",
                "image_url": menu_item.get("image_url", ""),
            }

            food_resp = await client.post(f"{FOOD_ORDER_URL}/food-order", json=order_payload)
            if food_resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to create food order")

            food_order_responses.append(food_resp.json().get("order"))

        # process payment via wrapper
        payment_resp = await client.post(
            f"{PAYMENT_URL}/payment/process",
            json={
                "Amount": to_minor_units(total_amount),
                "Currency": PAYMENT_CURRENCY,
                "PaymentMethod": normalize_payment_method(payload.payment_method),
                "VoucherCode": "",
            },
        )

        if payment_resp.status_code != 200:
            payment_error = None
            try:
                payment_error = payment_resp.json()
            except ValueError:
                payment_error = payment_resp.text

            raise HTTPException(
                status_code=502,
                detail={
                    "message": "Payment service failed",
                    "downstream_status": payment_resp.status_code,
                    "downstream_response": payment_error,
                },
            )

        payment = payment_resp.json()

        # save booking record in activity service and/or Supabase table
        booking_payload = {
            "user_name": payload.user_name,
            "user_email": payload.user_email,
            "activity_id": payload.activity_id,
            "activity_name": activity.get("name", ""),
            "start_time": payload.start_time,
            "end_time": payload.end_time,
            "food_orders": food_order_responses,
            "total_amount": total_amount,
            "status": "confirmed",
            "payment": payment,
            "additional_notes": payload.additional_notes or "",
        }

        booking_save_resp = await client.post(f"{ACTIVITY_URL}/bookings", json=booking_payload)
        if booking_save_resp.status_code not in (200, 201):
            error_body = None
            try:
                error_body = booking_save_resp.json()
            except ValueError:
                error_body = booking_save_resp.text

            # non-blocking fallback, still continue with booking success but warn
            saved_booking = {
                "warning": "Booking created but failed to persist in booking table",
                "error": error_body,
                "payload": booking_payload,
            }
        else:
            saved_booking = booking_save_resp.json()

        notification_result = {"success": False, "queued": False, "message": "Confirmation email not queued"}
        try:
            booking_record = saved_booking.get("booking") if isinstance(saved_booking, dict) else None
            await publish_booking_confirmation_event(
                {
                    "booking_id": (booking_record or {}).get("id") or (booking_record or {}).get("booking_id"),
                    "user_email": payload.user_email,
                    "user_name": payload.user_name,
                    "activity_id": payload.activity_id,
                    "activity_name": activity.get("name", ""),
                    "start_time": payload.start_time,
                    "end_time": payload.end_time,
                    "food_orders": food_order_responses,
                    "total_amount": total_amount,
                    "payment": payment,
                    "message": f"Your booking for {activity.get('name')} is confirmed. Total: ${total_amount:.2f}",
                }
            )
            notification_result = {
                "success": True,
                "queued": True,
                "message": "Confirmation email queued for delivery",
            }
        except Exception as exc:
            logger.exception("Failed to publish booking confirmation event")
            notification_result = {
                "success": False,
                "queued": False,
                "message": "Booking confirmed but confirmation email could not be queued",
                "error": str(exc),
            }

        return {
            "success": True,
            "booking": saved_booking,
            "food_orders": food_order_responses,
            "payment": payment,
            "activity": activity,
            "total_amount": total_amount,
            "notification": notification_result,
        }


@app.get("/booking/availability")
async def get_booking_availability(
    start_time: str = Query(...),
    end_time: str = Query(...),
    activity_id: str = Query(...),
):
    async with httpx.AsyncClient() as client:
        params = {"start_time": start_time, "end_time": end_time, "activity_id": activity_id}

        availability_resp = await client.get(
            f"{ACTIVITY_URL}/bookings/availability",
            params=params,
        )

    try:
        availability_body = availability_resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Invalid response from activity service")

    if availability_resp.status_code != 200:
        raise HTTPException(
            status_code=availability_resp.status_code,
            detail=availability_body.get("detail", "Failed to fetch slot availability"),
        )

    return availability_body

#Activities link to activity service(atomic service)
@app.get("/activities")
async def get_activities():
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{ACTIVITY_URL}/activities")
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