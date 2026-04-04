"""
Quick Gemini connectivity test.
Reads GEMINI_API_KEY from .env and sends a simple message.
"""

import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types, errors

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set. Add it to a .env file or export it.")
    raise SystemExit(1)

client = genai.Client(api_key=API_KEY)

print(f"Sending test message to Gemini (model: {MODEL}) …")

try:
    response = client.models.generate_content(
        model=MODEL,
        contents="Reply with exactly: Gemini is working!",
        config=types.GenerateContentConfig(temperature=0),
    )

    reply = response.text.strip()
    print(f"Response: {reply}")
    print("✅ Gemini is reachable — you have not run out of tokens.")

except errors.APIError as e:
    body = str(e)
    if "429" in body or "RESOURCE_EXHAUSTED" in body:
        print("❌ Gemini quota exhausted (HTTP 429).")
        print("   Your free tier limit has been reached. Check your quota at:")
        print("   https://ai.dev/rate-limit")
    elif "403" in body or "FORBIDDEN" in body:
        print("❌ Gemini API key is invalid or disabled (HTTP 403).")
    elif "401" in body or "UNAUTHORIZED" in body:
        print("❌ Gemini API key is missing or incorrect (HTTP 401).")
    else:
        print(f"❌ Gemini API error: {e}")
    sys.exit(1)

except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
