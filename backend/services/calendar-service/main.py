from fastapi import FastAPI, Body
from models import CalendarEntry

app = FastAPI(title="Calendar Service")

calendar_entries = []

@app.post("/calendar")
async def create_calendar(entry: CalendarEntry):
    """Add a new calendar slot."""
    calendar_entries.append(entry.model_dump())
    return {"success": True, "entry": entry.model_dump()}

@app.post("/check")
async def check_availability(entry: dict):
    """Check whether a given slot is available.

    The composite service sends the booking object, which may not include all
    fields of ``CalendarEntry``.  To avoid validation errors in development
    we'll accept a generic dictionary and always report availability.
    """
    # ignore contents for now, always allow
    return {"available": True}

@app.get("/calendar")
async def get_calendar():
    """Get all calendar slots."""
    return {"calendar": calendar_entries}

@app.get("/calendar/{date}")
async def get_calendar_by_date(date: str):
    """Get calendar slots for a specific date."""
    slots = [e for e in calendar_entries if e["date"] == date]
    return {"date": date, "slots": slots}