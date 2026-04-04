"""
Quick Groq connectivity test.
Reads GROQ_API_KEY from .env and sends a simple message.
"""

import os
import sys
from dotenv import load_dotenv
from groq import Groq, APIError, APIConnectionError

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

if not API_KEY:
    print("ERROR: GROQ_API_KEY not set. Add it to a .env file or export it.")
    raise SystemExit(1)

client = Groq(api_key=API_KEY)

print(f"Sending test message to Groq (model: {MODEL}) …")

try:
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": "Reply with exactly: Groq is working!"}],
        temperature=0,
    )

    reply = completion.choices[0].message.content.strip()
    print(f"Response: {reply}")
    print("✅ Groq is reachable — you have not run out of tokens.")

except APIError as e:
    status = e.status_code
    if status == 429:
        print("❌ Groq quota exhausted (HTTP 429). You've used up your token allowance.")
    elif status == 401:
        print("❌ Groq API key is invalid (HTTP 401).")
    else:
        print(f"❌ Groq API error (HTTP {status}): {e}")
    sys.exit(1)

except APIConnectionError as e:
    print(f"❌ Could not connect to Groq: {e}")
    sys.exit(1)

except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
