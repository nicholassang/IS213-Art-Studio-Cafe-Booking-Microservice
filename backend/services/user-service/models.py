from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class AuthModel(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4, max_length=128)
    email: Optional[EmailStr] = None