import os
from dotenv import load_dotenv
import resend 

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
# When Resend is in test mode (no verified domain), set this to the single
# verified address so all emails are redirected there instead of being rejected.
RESEND_TEST_RECIPIENT = os.getenv("RESEND_TEST_RECIPIENT")
RESEND_FORCE_TEST_RECIPIENT = os.getenv("RESEND_FORCE_TEST_RECIPIENT", "false").lower() == "true"

async def send_email_transaction_notification_wrapper(
    to_email: str,
    username: str,
    message: str = "Thank you for your booking!",
    subject: str = "Art Cafe Booking Confirmation",
    html: str | None = None,
):
    if not resend.api_key:
        raise ValueError("RESEND_API_KEY is not configured")

    effective_to = to_email
    if RESEND_FORCE_TEST_RECIPIENT and RESEND_TEST_RECIPIENT:
        effective_to = RESEND_TEST_RECIPIENT

    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [effective_to],
        "subject": subject,
        "html": html
        if html
        else f"""
        <h1>Hello {username}</h1>
        <p>{message}</p>
        """,
    }
    response = resend.Emails.send(params)
    print(response)
    return response