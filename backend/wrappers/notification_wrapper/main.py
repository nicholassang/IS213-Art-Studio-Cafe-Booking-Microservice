import os
from dotenv import load_dotenv
import resend 

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

# Untested code 
async def send_email_transaction_notification_wrapper(to_email: str, username: str, message: str = "Thank you for your booking!"):
    if not resend.api_key:
        raise ValueError("RESEND_API_KEY is not configured")

    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": "Art Cafe Transaction Receipt",
        "html": f"""
        <h1>Hello {username}</h1>
        <p>{message}</p>
        """
    }
    response = resend.Emails.send(params)
    print(response)
    return response