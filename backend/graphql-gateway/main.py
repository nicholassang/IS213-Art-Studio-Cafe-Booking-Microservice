import asyncio
import os
from typing import Any, Optional

import httpx
import strawberry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from graphql import GraphQLError
from strawberry.fastapi import GraphQLRouter
from strawberry.scalars import JSON

BOOKING_COMPOSITE_URL = os.getenv("BOOKING_COMPOSITE_URL", "http://make-booking-composite-service:8000")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "15"))


def build_forward_headers(request) -> dict[str, str]:
    cookie = request.headers.get("cookie")
    if not cookie:
        return {}
    return {"cookie": cookie}


def extract_detail(payload: Any) -> Any:
    if isinstance(payload, dict):
        return payload.get("detail", payload)
    return payload


def extract_message(payload: Any, fallback: str) -> str:
    detail = extract_detail(payload)

    if isinstance(detail, str) and detail.strip():
        return detail

    if isinstance(detail, dict):
        downstream_response = detail.get("downstream_response")
        downstream_message = None
        if isinstance(downstream_response, dict):
            downstream_message = downstream_response.get("detail") or downstream_response.get("message")

        message = detail.get("message") or downstream_message
        if isinstance(message, str) and message.strip():
            return message

    return fallback


async def request_json(
    method: str,
    path: str,
    *,
    params: Optional[dict[str, Any]] = None,
    json_body: Optional[dict[str, Any]] = None,
    headers: Optional[dict[str, str]] = None,
) -> tuple[int, Any]:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        response = await client.request(
            method,
            f"{BOOKING_COMPOSITE_URL}{path}",
            params=params,
            json=json_body,
            headers=headers,
        )

    try:
        body = response.json()
    except ValueError:
        body = response.text

    return response.status_code, body


@strawberry.type
class Activity:
    id: str
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[str] = None
    image: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    level: Optional[str] = None
    emoji: Optional[str] = None


@strawberry.type
class MenuItem:
    id: int
    name: str
    price: float
    category: Optional[str] = None
    image_url: Optional[str] = None


@strawberry.type
class BookingPageData:
    activities: list[Activity]
    menu: list[MenuItem]


@strawberry.type
class BookingAvailability:
    activity_id: str
    start_time: str
    end_time: str
    max_slots: int
    booked_slots: int
    remaining_slots: int
    is_full: bool


@strawberry.type
class CreateBookingPayload:
    success: bool
    message: str
    booking_id: Optional[str] = None
    notification_queued: bool = False
    total_amount: Optional[float] = None
    booking: Optional[JSON] = None
    food_orders: Optional[JSON] = None
    payment: Optional[JSON] = None
    activity: Optional[JSON] = None
    error_detail: Optional[JSON] = None


@strawberry.input
class FoodItemInput:
    id: int
    quantity: int
    comment: Optional[str] = ""


@strawberry.input
class CreateBookingInput:
    user_name: str
    user_email: str
    activity_id: str
    start_time: str
    end_time: str
    food_items: list[FoodItemInput]
    payment_method: str = "pm_card_visa"
    additional_notes: Optional[str] = None


def to_activity(data: dict[str, Any]) -> Activity:
    return Activity(
        id=str(data.get("id", "")),
        name=data.get("name", ""),
        category=data.get("category"),
        description=data.get("description"),
        price=data.get("price"),
        duration=data.get("duration"),
        image=data.get("image"),
        rating=data.get("rating"),
        reviews=data.get("reviews"),
        level=data.get("level"),
        emoji=data.get("emoji"),
    )


def to_menu_item(data: dict[str, Any]) -> MenuItem:
    return MenuItem(
        id=int(data.get("id", 0)),
        name=data.get("name", ""),
        price=float(data.get("price", 0)),
        category=data.get("category"),
        image_url=data.get("image_url"),
    )


def extract_booking_id(payload: Any) -> Optional[str]:
    if not isinstance(payload, dict):
        return None

    booking = payload.get("booking")
    if isinstance(booking, dict):
        nested_booking = booking.get("booking")
        if isinstance(nested_booking, dict) and nested_booking.get("id") is not None:
            return str(nested_booking.get("id"))
        if booking.get("id") is not None:
            return str(booking.get("id"))

    return None


@strawberry.type
class Query:
    @strawberry.field
    async def booking_page_data(self) -> BookingPageData:
        try:
            (activities_status, activities_body), (menu_status, menu_body) = await asyncio.gather(
                request_json("GET", "/activities"),
                request_json("GET", "/menu"),
            )
        except httpx.HTTPError as exc:
            raise GraphQLError(f"GraphQL gateway could not load booking page data: {exc}")

        if activities_status != 200:
            raise GraphQLError(extract_message(activities_body, "Unable to load activities."))

        if menu_status != 200:
            raise GraphQLError(extract_message(menu_body, "Unable to load menu."))

        if not isinstance(activities_body, dict) or not isinstance(menu_body, dict):
            raise GraphQLError("GraphQL gateway received an invalid response for booking page data.")

        activities = [to_activity(activity) for activity in activities_body.get("activities", [])]
        menu = [to_menu_item(item) for item in menu_body.get("menu", [])]
        return BookingPageData(activities=activities, menu=menu)

    @strawberry.field
    async def booking_availability(self, start_time: str, end_time: str, activity_id: str) -> BookingAvailability:
        try:
            status_code, body = await request_json(
                "GET",
                "/booking/availability",
                params={
                    "start_time": start_time,
                    "end_time": end_time,
                    "activity_id": activity_id,
                },
            )
        except httpx.HTTPError as exc:
            raise GraphQLError(f"GraphQL gateway could not load booking availability: {exc}")

        if status_code != 200:
            raise GraphQLError(extract_message(body, "Unable to load booking availability."))

        return BookingAvailability(
            activity_id=str(body.get("activity_id", activity_id)),
            start_time=body.get("start_time", start_time),
            end_time=body.get("end_time", end_time),
            max_slots=int(body.get("max_slots", 0)),
            booked_slots=int(body.get("booked_slots", 0)),
            remaining_slots=int(body.get("remaining_slots", 0)),
            is_full=bool(body.get("is_full", False)),
        )


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_booking(self, info: strawberry.Info, input: CreateBookingInput) -> CreateBookingPayload:
        headers = build_forward_headers(info.context["request"])

        payload = {
            "user_name": input.user_name,
            "user_email": input.user_email,
            "activity_id": input.activity_id,
            "start_time": input.start_time,
            "end_time": input.end_time,
            "food_items": [
                {"id": item.id, "quantity": item.quantity, "comment": item.comment or ""}
                for item in input.food_items
            ],
            "payment_method": input.payment_method,
            "additional_notes": input.additional_notes or "",
        }

        try:
            status_code, body = await request_json("POST", "/booking", json_body=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise GraphQLError(f"GraphQL gateway could not create booking: {exc}")

        if status_code not in (200, 201):
            return CreateBookingPayload(
                success=False,
                message=extract_message(body, "Failed to complete booking. Please try again."),
                error_detail=extract_detail(body),
            )

        notification = body.get("notification", {}) if isinstance(body, dict) else {}
        notification_queued = bool(notification.get("queued", False))

        return CreateBookingPayload(
            success=True,
            message=(
                "Booking completed. Confirmation email queued."
                if notification_queued
                else "Booking completed, but the confirmation email could not be queued."
            ),
            booking_id=extract_booking_id(body),
            notification_queued=notification_queued,
            total_amount=body.get("total_amount") if isinstance(body, dict) else None,
            booking=body.get("booking") if isinstance(body, dict) else None,
            food_orders=body.get("food_orders") if isinstance(body, dict) else None,
            payment=body.get("payment") if isinstance(body, dict) else None,
            activity=body.get("activity") if isinstance(body, dict) else None,
        )


schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema, graphiql=True)

app = FastAPI(title="Frontend GraphQL Gateway")

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


@app.get("/")
def health_check():
    return {"message": "Frontend GraphQL Gateway is running"}


app.include_router(graphql_app, prefix="/graphql")