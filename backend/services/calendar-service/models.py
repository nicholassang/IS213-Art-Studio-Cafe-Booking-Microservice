from pydantic import BaseModel, Field

class CalendarEntry(BaseModel):
    date: str  
    startTime: str
    endTime: str
    availableSlots: int = Field(..., gt=0)