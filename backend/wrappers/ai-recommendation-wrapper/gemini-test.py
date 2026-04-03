#!/usr/bin/env python3
"""
Test Gemini connection and measure response times.

Usage:
    python gemini-test.py
"""

import time
from google import genai
from google.genai import types

# Load environment variables
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-2.0-flash"

if not API_KEY:
    print("❌ GEMINI_API_KEY not found in .env file")
    exit(1)

print(f"🔑 API Key: {API_KEY[:10]}...{API_KEY[-4:]}")
print(f"🤖 Model: {MODEL}")
print()

client = genai.Client(api_key=API_KEY)


def test_basic_connection():
    """Test 1: Basic connectivity"""
    print("=" * 60)
    print("TEST 1: Basic Connection")
    print("=" * 60)
    
    try:
        start = time.time()
        response = client.models.generate_content(
            model=MODEL,
            contents="Say 'connected' if you can read this.",
        )
        elapsed = time.time() - start
        
        print(f"✅ Response time: {elapsed:.2f}s")
        print(f"📝 Response: {response.text.strip()}")
        print()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print()
        return False


def test_scoring_prompt():
    """Test 2: Simulate the scoring prompt (Call 1)"""
    print("=" * 60)
    print("TEST 2: Scoring Prompt (temperature=0)")
    print("=" * 60)
    
    system_prompt = """You are a quiz scoring engine. Score answers on two axes:
- solo_social_score (0-10): 0=prefers solo, 10=prefers social
- structured_freeform_score (0-10): 0=prefers structured, 10=prefers freeform

Respond ONLY with JSON:
{"solo_social_score": 5, "structured_freeform_score": 5, "reasoning": "brief explanation"}"""

    user_prompt = """Customer's Quiz Responses:

Q1 (Social Preference): Do you prefer working alone or with others?
  Answer: I like working with people sometimes

Q2 (Learning Style): How do you like to learn new skills?
  Answer: By following step-by-step instructions

Score this customer on the Solo↔Social and Structured↔Freeform axes."""

    try:
        start = time.time()
        response = client.models.generate_content(
            model=MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0,
            ),
        )
        elapsed = time.time() - start
        
        print(f"✅ Response time: {elapsed:.2f}s")
        print(f"📝 Response:\n{response.text.strip()}")
        print()
        return True
    except Exception as e:
        print(f"❌ Scoring prompt failed: {e}")
        print()
        return False


def test_profile_prompt():
    """Test 3: Simulate the profile generation prompt (Call 2)"""
    print("=" * 60)
    print("TEST 3: Profile Generation (temperature=0.7)")
    print("=" * 60)
    
    system_prompt = """You are a personality profiler for a café/art studio booking system.
Write a personalised profile for the customer based on their quiz answers and scores.

Respond ONLY with JSON:
{
  "profile_title": "Catchy personality type name",
  "profile_body": "2-3 paragraph description",
  "activity_explanations": [
    {"rank": 1, "activity": "Activity Name", "explanation": "Why this fits"}
  ],
  "closing": "Encouraging closing statement"
}"""

    user_prompt = """Customer's Quiz Responses:

Q1 (Social Preference): Do you prefer working alone or with others?
  Answer: I like working with people sometimes

Q2 (Learning Style): How do you like to learn new skills?
  Answer: By following step-by-step instructions

Personality Type: Workshop Goer
Solo↔Social Score: 4/10
Structured↔Freeform Score: 3/10
Scoring Reasoning: Shows preference for structured activities with moderate social interaction

Write a personalised profile for this customer."""

    try:
        start = time.time()
        response = client.models.generate_content(
            model=MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
            ),
        )
        elapsed = time.time() - start
        
        print(f"✅ Response time: {elapsed:.2f}s")
        print(f"📝 Response:\n{response.text.strip()[:500]}...")
        print()
        return True
    except Exception as e:
        print(f"❌ Profile generation failed: {e}")
        print()
        return False


def test_concurrent_calls():
    """Test 4: Simulate both AI calls in sequence (like the real flow)"""
    print("=" * 60)
    print("TEST 4: Sequential Calls (simulating real flow)")
    print("=" * 60)
    
    import asyncio
    
    async def run_test():
        total_start = time.time()
        
        # Call 1: Scoring
        print("\n⏳ Call 1: Scoring...")
        start1 = time.time()
        response1 = await client.aio.models.generate_content(
            model=MODEL,
            contents="Score: solo=4, structured=3. Return JSON.",
            config=types.GenerateContentConfig(
                system_instruction="You are a scoring engine. Return JSON with solo_social_score and structured_freeform_score.",
                temperature=0,
            ),
        )
        elapsed1 = time.time() - start1
        print(f"✅ Call 1 completed: {elapsed1:.2f}s")
        
        # Call 2: Profile
        print("\n⏳ Call 2: Profile Generation...")
        start2 = time.time()
        response2 = await client.aio.models.generate_content(
            model=MODEL,
            contents="Generate profile for Workshop Goer type.",
            config=types.GenerateContentConfig(
                system_instruction="You are a profile generator. Return JSON with profile_title, profile_body, activity_explanations, closing.",
                temperature=0.7,
            ),
        )
        elapsed2 = time.time() - start2
        print(f"✅ Call 2 completed: {elapsed2:.2f}s")
        
        total = time.time() - total_start
        print(f"\n📊 Total time: {total:.2f}s")
        print(f"   Call 1: {elapsed1:.2f}s")
        print(f"   Call 2: {elapsed2:.2f}s")
        
        return total < 60
    
    try:
        result = asyncio.run(run_test())
        print()
        return result
    except Exception as e:
        print(f"\n❌ Sequential test failed: {e}")
        print()
        return False


if __name__ == "__main__":
    print("🧪 Gemini Connection Test Suite\n")
    
    results = []
    
    results.append(("Basic Connection", test_basic_connection()))
    results.append(("Scoring Prompt", test_scoring_prompt()))
    results.append(("Profile Generation", test_profile_prompt()))
    results.append(("Sequential Calls", test_concurrent_calls()))
    
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    print()
    if all(r[1] for r in results):
        print("🎉 All tests passed! Gemini is working correctly.")
        print("\nIf your quiz_cli still times out, the issue is likely:")
        print("  • RabbitMQ consumer not running (check ai-recommendation-wrapper logs)")
        print("  • Network latency between services")
        print("  • Supabase storage slowdown")
    else:
        print("⚠️  Some tests failed. Check your API key and network connection.")
