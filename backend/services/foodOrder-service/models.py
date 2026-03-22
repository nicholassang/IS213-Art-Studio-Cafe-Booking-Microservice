from pydantic import BaseModel
from typing import Optional

#bring what the front-end sends
class OrderItem(BaseModel):
    menu_item_id: int
    name: str
    price: float
    quantity: int
    image_url: Optional[str] = ""
    comment: Optional[str] = ""

class QuantityUpdate(BaseModel):
    quantity: int