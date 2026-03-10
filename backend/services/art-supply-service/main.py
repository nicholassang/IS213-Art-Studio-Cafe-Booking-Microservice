from fastapi import FastAPI, Body
from pydantic import BaseModel

app = FastAPI()

# In-memory store for reserved supplies
reserved_supplies = []

class ArtSupplyBooking(BaseModel):
    startTime: str
    endTime: str
    numPeople: int
    suppliesNeeded: list[str] = ["paint", "brushes"] 

@app.post("/reserve")
async def reserve_art_supplies(booking: ArtSupplyBooking):
    reserved_supplies.append(booking.model_dump())
    return {"success": True, "reserved": booking.model_dump()}

@app.get("/reserved")
async def get_reserved():
    return {"reserved": reserved_supplies}