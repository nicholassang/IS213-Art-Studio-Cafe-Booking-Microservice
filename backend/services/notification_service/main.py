import asyncio
from contextlib import suppress
import json
import logging
import os

import aio_pika
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ValidationError
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
    total_amount: float
    payment: dict
    message: str = "Your booking has been confirmed."


async def handle_booking_confirmation_message(message: aio_pika.IncomingMessage):
    async with message.process(ignore_processed=True):
        try:
            payload = json.loads(message.body.decode("utf-8"))
            event = BookingConfirmationEvent(**payload)
        except (json.JSONDecodeError, ValidationError):
            logger.exception("Discarding invalid booking confirmation message")
            return

        try:
            await send_email_transaction_notification_wrapper(
                event.user_email,
                event.user_name,
                event.message,
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