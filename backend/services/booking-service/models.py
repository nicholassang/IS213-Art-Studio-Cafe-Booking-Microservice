from pydantic import BaseModel, Field

class Booking(BaseModel):
    startTime: str
    endTime: str
    numPeople: int = Field(..., gt=0)