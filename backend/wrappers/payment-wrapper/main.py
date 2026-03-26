from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Payment Wrapper")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PaymentRequest(BaseModel):
    amount: float
    currency: str = "USD"
    payment_method: str = "card"
    description: str = ""

@app.post("/process-payment")
async def process_payment(payload: PaymentRequest):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # TODO: integrate with real payment processor (Stripe, PayPal, etc.)
    return {
        "success": True,
        "transaction_id": f"TXN-{int(payload.amount * 100)}-{payload.payment_method}",
        "amount": payload.amount,
        "currency": payload.currency,
        "payment_method": payload.payment_method,
        "description": payload.description,
        "status": "paid",
    }

@app.get("/")
async def home():
    return {"message": "Payment wrapper is running"}
