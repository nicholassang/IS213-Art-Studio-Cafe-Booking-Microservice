from fastapi import FastAPI
from models import Booking

app = FastAPI()

bookings = []

@app.post("/bookings")
async def create_booking(booking: Booking):
    bookings.append(booking.model_dump())
    return {"success": True, "booking": booking}

@app.get("/bookings")
async def get_bookings():
    return {"bookings": bookings}