import asyncio
from contextlib import suppress
import json
import logging
import os

import aio_pika
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ValidationError, Field
from wrappers.notification_wrapper.main import send_email_transaction_notification_wrapper

app = FastAPI(title="Notification Service")

logger = logging.getLogger(__name__)
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
BOOKING_EVENTS_EXCHANGE = "booking.events"
BOOKING_CONFIRMATION_QUEUE = "booking.confirmation.email"
BOOKING_CONFIRMED_ROUTING_KEY = "booking.confirmed"

class NotificationRequest(BaseModel):
    to_email: str
    username: str
    message: str = "Your booking has been confirmed."


class BookingConfirmationEvent(BaseModel):
    booking_id: str | int | None = None
    user_email: str
    user_name: str
    activity_id: str
    activity_name: str
    start_time: str
    end_time: str
    food_orders: list[dict] = Field(default_factory=list)
    total_amount: float
    payment: dict
    message: str = "Your booking has been confirmed."


def build_booking_confirmation_email(event: BookingConfirmationEvent) -> tuple[str, str]:
    food_rows = []
    for item in event.food_orders:
        name = item.get("name") or f"Item {item.get('menu_item_id', '')}".strip()
        qty = item.get("quantity", 1)
        unit_price = float(item.get("price", 0) or 0)
        line_total = unit_price * qty
        food_rows.append(
            f"<tr><td style='padding:6px 0'>{name}</td><td style='padding:6px 0; text-align:center'>{qty}</td><td style='padding:6px 0; text-align:right'>${line_total:.2f}</td></tr>"
        )

    if not food_rows:
        food_rows.append("<tr><td style='padding:6px 0' colspan='3'>No food items recorded</td></tr>")

    subject = f"Your Art Cafe booking is confirmed, {event.user_name}!"
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #241c17; line-height: 1.5;">
      <h2>Thank you, {event.user_name}.</h2>
      <p>We are grateful for your booking at Art Studio Cafe. Your payment has been received successfully, and we cannot wait to host you.</p>

      <h3>Booking Summary</h3>
      <p><strong>Booking ID:</strong> {event.booking_id or 'Pending'}</p>
      <p><strong>Activity:</strong> {event.activity_name}</p>
      <p><strong>Time:</strong> {event.start_time} to {event.end_time}</p>

      <h3>Food Order Summary</h3>
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom: 1px solid #e6ddd1; padding: 6px 0;">Item</th>
            <th style="text-align:center; border-bottom: 1px solid #e6ddd1; padding: 6px 0;">Qty</th>
            <th style="text-align:right; border-bottom: 1px solid #e6ddd1; padding: 6px 0;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {''.join(food_rows)}
        </tbody>
      </table>

      <p style="margin-top: 14px;"><strong>Total Paid:</strong> ${event.total_amount:.2f}</p>
      <p style="margin-top: 20px;">Thank you again for supporting our cafe and creative community.</p>
    </div>
    """
    return subject, html


async def handle_booking_confirmation_message(message: aio_pika.IncomingMessage):
    async with message.process(ignore_processed=True):
        try:
            payload = json.loads(message.body.decode("utf-8"))
            event = BookingConfirmationEvent(**payload)
        except (json.JSONDecodeError, ValidationError):
            logger.exception("Discarding invalid booking confirmation message")
            return

        try:
            subject, html = build_booking_confirmation_email(event)
            await send_email_transaction_notification_wrapper(
                event.user_email,
                event.user_name,
                event.message,
                subject=subject,
                html=html,
            )
        except Exception:
            logger.exception(
                "Failed to send confirmation email to %s; message will be acked",
                event.user_email,
            )


async def consume_booking_confirmation_events():
    while True:
        connection = None
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=10)

            exchange = await channel.declare_exchange(
                BOOKING_EVENTS_EXCHANGE,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )
            queue = await channel.declare_queue(BOOKING_CONFIRMATION_QUEUE, durable=True)
            await queue.bind(exchange, routing_key=BOOKING_CONFIRMED_ROUTING_KEY)
            await queue.consume(handle_booking_confirmation_message)

            app.state.rabbitmq_connection = connection
            logger.info("RabbitMQ consumer connected for booking confirmations")
            await asyncio.Future()
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("RabbitMQ consumer stopped; retrying")
            await asyncio.sleep(5)
        finally:
            if connection and not connection.is_closed:
                await connection.close()
            app.state.rabbitmq_connection = None


@app.on_event("startup")
async def start_rabbitmq_consumer():
    app.state.consumer_task = asyncio.create_task(consume_booking_confirmation_events())


@app.on_event("shutdown")
async def stop_rabbitmq_consumer():
    consumer_task = getattr(app.state, "consumer_task", None)
    if consumer_task:
        consumer_task.cancel()
        with suppress(asyncio.CancelledError):
            await consumer_task

    connection = getattr(app.state, "rabbitmq_connection", None)
    if connection and not connection.is_closed:
        await connection.close()

# Legacy endpoint for testing email sending without RabbitMQ
@app.post("/send-transaction-notification")
async def send_notification(payload: NotificationRequest):
    try:
        result = await send_email_transaction_notification_wrapper(payload.to_email, payload.username, payload.message)
        return {"success": True, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))