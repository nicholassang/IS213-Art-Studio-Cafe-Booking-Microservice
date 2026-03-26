from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from wrappers.notification_wrapper.main import send_email_transaction_notification_wrapper

app = FastAPI(title="Notification Service")

class NotificationRequest(BaseModel):
    to_email: str
    username: str
    message: str = "Your booking has been confirmed."

@app.post("/send-transaction-notification")
async def send_notification(payload: NotificationRequest):
    try:
        result = await send_email_transaction_notification_wrapper(payload.to_email, payload.username, payload.message)
        return {"success": True, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))