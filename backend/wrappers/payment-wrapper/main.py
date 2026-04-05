import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Payment Wrapper")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ODC endpoints from environment variables
ODC_COMPOSITE_URL = os.getenv(
    "ODC_COMPOSITE_URL",
    "https://personal-xgmyo0qv.outsystemscloud.com/Payment_Voucher_Composite/rest/CompositePaymentAPI"
)
ODC_PAYMENT_URL = os.getenv(
    "ODC_PAYMENT_URL",
    "https://personal-xgmyo0qv.outsystemscloud.com/Stripe_Payments/rest/PaymentAPI"
)
ODC_VOUCHER_URL = os.getenv(
    "ODC_VOUCHER_URL",
    "https://personal-xgmyo0qv.outsystemscloud.com/Voucher/rest/VoucherAPI"
)

# ─── Request models ───────────────────────────────────────────────────────────

class CreateIntentRequest(BaseModel):
    Amount: int
    Currency: str = "sgd"

class CancelIntentRequest(BaseModel):
    PaymentIntentId: str

class ProcessPaymentRequest(BaseModel):
    Amount: int
    Currency: str = "sgd"
    PaymentMethod: str
    VoucherCode: Optional[str] = ""


class LegacyProcessPaymentRequest(BaseModel):
    amount: float
    currency: str = "sgd"
    payment_method: str
    voucher_code: Optional[str] = ""

class ValidateVoucherRequest(BaseModel):
    VoucherCode: str

# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/")
async def home():
    return {"message": "Payment wrapper is running"}

# ─── Payment endpoints ────────────────────────────────────────────────────────

@app.post("/payment/create-intent")
async def create_payment_intent(payload: CreateIntentRequest):
    """Create a Stripe PaymentIntent via ODC"""
    if payload.Amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if not payload.Currency:
        raise HTTPException(status_code=400, detail="Currency is required")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{ODC_PAYMENT_URL}/CreatePaymentIntent",
                json={"Amount": payload.Amount, "Currency": payload.Currency},
                timeout=30.0
            )
            res.raise_for_status()
            return res.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"ODC error: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"ODC unreachable: {str(e)}")


@app.post("/payment/cancel")
async def cancel_payment_intent(payload: CancelIntentRequest):
    """Cancel a Stripe PaymentIntent via ODC"""
    if not payload.PaymentIntentId:
        raise HTTPException(status_code=400, detail="PaymentIntentId is required")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{ODC_PAYMENT_URL}/CancelPaymentIntent",
                params={"PaymentIntentId": payload.PaymentIntentId},  # ← change json= to params=
                timeout=30.0
            )
            res.raise_for_status()
            return res.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"ODC error: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"ODC unreachable: {str(e)}")


@app.post("/payment/process")
async def process_payment(payload: ProcessPaymentRequest):
    """Process a full payment (with optional voucher) via ODC composite"""
    if payload.Amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if not payload.PaymentMethod:
        raise HTTPException(status_code=400, detail="PaymentMethod is required")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{ODC_COMPOSITE_URL}/ProcessPayment",
                json={
                    "Amount": payload.Amount,
                    "Currency": payload.Currency,
                    "PaymentMethod": payload.PaymentMethod,
                    "VoucherCode": payload.VoucherCode or "",
                },
                timeout=30.0
            )
            res.raise_for_status()
            return res.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"ODC error: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"ODC unreachable: {str(e)}")


@app.post("/process-payment")
async def process_payment_legacy(payload: LegacyProcessPaymentRequest):
    mapped_payload = ProcessPaymentRequest(
        Amount=max(1, int(round(payload.amount * 100))),
        Currency=payload.currency.lower(),
        PaymentMethod=payload.payment_method,
        VoucherCode=payload.voucher_code or "",
    )
    return await process_payment(mapped_payload)


# ─── Voucher endpoints ────────────────────────────────────────────────────────

@app.post("/voucher/validate")
async def validate_voucher(payload: ValidateVoucherRequest):
    """Validate a voucher code via ODC"""
    if not payload.VoucherCode:
        raise HTTPException(status_code=400, detail="VoucherCode is required")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{ODC_VOUCHER_URL}/ValidateVoucher",
                json={"VoucherCode": payload.VoucherCode},
                timeout=30.0
            )
            res.raise_for_status()
            return res.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"ODC error: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"ODC unreachable: {str(e)}")
