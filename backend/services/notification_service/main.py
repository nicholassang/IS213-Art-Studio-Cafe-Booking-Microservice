import asyncio
from contextlib import suppress
from datetime import datetime
from zoneinfo import ZoneInfo
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
BOOKING_CONFIRMATION_QUEUE = os.getenv(
    "BOOKING_CONFIRMATION_QUEUE", "booking.confirmation.email.v2"
)
BOOKING_CONFIRMED_ROUTING_KEY = "booking.confirmed"
BOOKING_CONFIRMATION_DLQ = os.getenv(
    "BOOKING_CONFIRMATION_DLQ", "booking.confirmation.dlq.v2"
)
BOOKING_CONFIRMATION_DLQ_ROUTING_KEY = os.getenv(
    "BOOKING_CONFIRMATION_DLQ_ROUTING_KEY", "booking.confirmed.dead"
)


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
    activity_price: float = 0.0
    start_time: str
    end_time: str
    food_orders: list[dict] = Field(default_factory=list)
    subtotal_amount: float | None = None
    total_amount: float
    payment: dict
    message: str = "Your booking has been confirmed."


def format_singapore_range(start_time: str, end_time: str) -> str:
    start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))

    sg_tz = ZoneInfo("Asia/Singapore")
    start_sg = start_dt.astimezone(sg_tz)
    end_sg = end_dt.astimezone(sg_tz)

    date_part = start_sg.strftime("%d %b %Y")
    start_part = start_sg.strftime("%I:%M %p").lstrip("0")
    end_part = end_sg.strftime("%I:%M %p").lstrip("0")

    return f"{date_part}, {start_part} to {end_part}"


def build_booking_confirmation_email(event: BookingConfirmationEvent) -> tuple[str, str]:
    formatted_time = format_singapore_range(event.start_time, event.end_time)

    food_subtotal = 0.0
    food_rows = []
    for item in event.food_orders:
        name = item.get("name") or f"Item {item.get('menu_item_id', '')}".strip()
        qty = item.get("quantity", 1)
        unit_price = float(item.get("price", 0) or 0)
        line_total = unit_price * qty
        food_subtotal += line_total
        food_rows.append(
            f"<tr>"
            f"<td style='padding:6px 0'>{name}</td>"
            f"<td style='padding:6px 0; text-align:center'>{qty}</td>"
            f"<td style='padding:6px 0; text-align:right'>${line_total:.2f}</td>"
            f"</tr>"
        )

    subtotal_amount = float(event.subtotal_amount) if event.subtotal_amount is not None else event.activity_price + food_subtotal
    discount_amount = max(0.0, subtotal_amount - event.total_amount)

    order_rows = [
        f"<tr>"
        f"<td style='padding:6px 0'>{event.activity_name}</td>"
        f"<td style='padding:6px 0; text-align:center'>1</td>"
        f"<td style='padding:6px 0; text-align:right'>${event.activity_price:.2f}</td>"
        f"</tr>"
    ]
    order_rows.extend(food_rows)

    if not event.food_orders:
        order_rows.append(
            "<tr><td style='padding:6px 0; color:#6d6258' colspan='3'>No food items ordered</td></tr>"
        )

    discount_row = ""
    if discount_amount > 0:
        discount_row = (
            f"<tr>"
            f"<td style='padding:6px 0' colspan='2'><strong>Discount Applied</strong></td>"
            f"<td style='padding:6px 0; text-align:right'>-${discount_amount:.2f}</td>"
            f"</tr>"
        )

    subject = f"Your Art Cafe booking is confirmed, {event.user_name}!"
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #241c17; line-height: 1.5;">
      <h2>Thank you, {event.user_name}.</h2>
      <p>We are grateful for your booking at Art Studio Cafe. Your payment has been received successfully, and we cannot wait to host you.</p>

      <h3>Booking Summary</h3>
      <p><strong>Booking ID:</strong> {event.booking_id or 'Pending'}</p>
      <p><strong>Activity:</strong> {event.activity_name}</p>
      <p><strong>Time:</strong> {formatted_time}</p>

            <h3>Order Summary</h3>
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom: 1px solid #e6ddd1; padding: 6px 0;">Item</th>
            <th style="text-align:center; border-bottom: 1px solid #e6ddd1; padding: 6px 0;">Qty</th>
            <th style="text-align:right; border-bottom: 1px solid #e6ddd1; padding: 6px 0;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
                    {''.join(order_rows)}
                    <tr>
                        <td style='padding:6px 0; border-top: 1px solid #e6ddd1;' colspan='2'><strong>Subtotal</strong></td>
                        <td style='padding:6px 0; border-top: 1px solid #e6ddd1; text-align:right'>${subtotal_amount:.2f}</td>
                    </tr>
                    {discount_row}
        </tbody>
      </table>

      <p style="margin-top: 14px;"><strong>Total Paid:</strong> ${event.total_amount:.2f}</p>
      <p style="margin-top: 20px;">Thank you again for supporting our cafe and creative community.</p>
    </div>
    """
    return subject, html


async def handle_booking_confirmation_message(message: aio_pika.IncomingMessage):
    async with message.process(ignore_processed=True, requeue=False):
        try:
            payload = json.loads(message.body.decode("utf-8"))
            event = BookingConfirmationEvent(**payload)
        except (json.JSONDecodeError, ValidationError):
            logger.exception("Dead-lettering invalid booking confirmation message")
            raise

        try:
            subject, html = build_booking_confirmation_email(event)
            await send_email_transaction_notification_wrapper(
                event.user_email,
                event.user_name,
                event.message,
                subject=subject,
                html=html,
            )
            logger.info(
                "Sent booking confirmation email for booking_id=%s to %s",
                event.booking_id,
                event.user_email,
            )
        except Exception as exc:
            logger.exception(
                "Failed to send confirmation email to %s; dead-lettering message",
                event.user_email,
            )
            raise exc


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
            dlq = await channel.declare_queue(BOOKING_CONFIRMATION_DLQ, durable=True)
            await dlq.bind(exchange, routing_key=BOOKING_CONFIRMATION_DLQ_ROUTING_KEY)

            queue = await channel.declare_queue(
                BOOKING_CONFIRMATION_QUEUE,
                durable=True,
                arguments={
                    "x-dead-letter-exchange": BOOKING_EVENTS_EXCHANGE,
                    "x-dead-letter-routing-key": BOOKING_CONFIRMATION_DLQ_ROUTING_KEY,
                },
            )
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


@app.post("/send-transaction-notification")
async def send_notification(payload: NotificationRequest):
    try:
        result = await send_email_transaction_notification_wrapper(
            payload.to_email,
            payload.username,
            payload.message,
        )
        return {"success": True, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))