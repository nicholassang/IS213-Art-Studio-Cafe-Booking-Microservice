"""
Integration test for the AI Recommender service.

This script:
1. Publishes a quiz submission event directly to RabbitMQ (matching the QuizSubmittedEvent schema)
2. Waits for the AI to process the quiz and generate a recommendation
3. Verifies the result was stored in Supabase via the /quiz/results endpoint
"""

import asyncio
import json
import os
import aio_pika
import httpx
from datetime import datetime, timezone
import uuid

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8006")
QUIZ_EXCHANGE = "quiz_events"
QUIZ_ROUTING_KEY = "quiz.submitted"


async def publish_quiz_event():
    """Publish a test quiz submission event directly to RabbitMQ.

    Uses the exact shape that the quiz service publishes:
    QuizSubmittedEvent with enriched answers (question_text, category, answer_text).
    """
    submission_id = str(uuid.uuid4())
    user_id = "test-user-ai-integration"

    payload = {
        "submission_id": submission_id,
        "user_id": user_id,
        "answers": [
            {
                "question_id": "fd1",
                "question_text": "What's your ideal order at a café — walk me through what you'd get?",
                "category": "food_and_drink",
                "answer_text": "I'd probably go for the specials and ask the barista for their recommendation. I love discovering new things.",
            },
            {
                "question_id": "fd4",
                "question_text": "Do you usually visit a café just for a drink, or do you like to make a meal of it?",
                "category": "food_and_drink",
                "answer_text": "A full meal — I come to eat and make an experience of it.",
            },
            {
                "question_id": "ap1",
                "question_text": "If a café offered a creative activity, what would you hope it looks like?",
                "category": "activity_preferences",
                "answer_text": "A guided workshop — painting, pottery, something hands-on with instruction.",
            },
            {
                "question_id": "ap4",
                "question_text": "Would you rather do a creative activity on your own, or does it feel better when others are involved?",
                "category": "activity_preferences",
                "answer_text": "In a small group — a few people I can connect with.",
            },
            {
                "question_id": "av1",
                "question_text": "Describe your perfect café atmosphere — what does it look, sound, and feel like?",
                "category": "ambience_and_vibe",
                "answer_text": "Lively and buzzing — chatter, music, a vibrant energy.",
            },
            {
                "question_id": "av3",
                "question_text": "What kind of music or background sound do you like in a café?",
                "category": "ambience_and_vibe",
                "answer_text": "Jazz, soul, or something with character.",
            },
            {
                "question_id": "vs1",
                "question_text": "Who do you usually visit cafés with, and what are you typically there for?",
                "category": "visit_style_and_occasion",
                "answer_text": "With a friend or partner — catching up over coffee.",
            },
            {
                "question_id": "vs5",
                "question_text": "What kind of occasion would most likely bring you to a café that offers a bookable activity?",
                "category": "visit_style_and_occasion",
                "answer_text": "A group event — birthday, team-building, friend group hangout.",
            },
        ],
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            QUIZ_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
        )

        message = aio_pika.Message(
            body=json.dumps(payload).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=QUIZ_ROUTING_KEY)
        print(f"✓ Quiz event published: submission_id={submission_id}")
        return submission_id, user_id


async def test_health_check():
    """Test the health endpoint of the AI service."""
    print("\n--- Testing Health Check ---")
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(f"{AI_SERVICE_URL}/health")
            if response.status_code == 200:
                health = response.json()
                print(f"  Health status: {json.dumps(health, indent=2)}")
                if health.get("status") == "healthy":
                    print("  ✓ AI service is healthy")
                    return True
                else:
                    print(f"  ✗ FAIL: AI service is unhealthy: {health.get('detail', {})}")
                    return False
            else:
                print(f"  ✗ FAIL: Health check returned {response.status_code}")
                return False
        except httpx.HTTPError as e:
            print(f"  ✗ FAIL: Could not connect to AI service: {e}")
            return False


async def wait_for_results(submission_id: str, timeout: float = 60.0, poll_interval: float = 3.0) -> dict | None:
    """Poll the /quiz/results endpoint until the AI has processed the submission."""
    print(f"  Polling /quiz/results/{submission_id} for up to {timeout}s...")
    start = asyncio.get_event_loop().time()

    async with httpx.AsyncClient(timeout=10.0) as client:
        while asyncio.get_event_loop().time() - start < timeout:
            try:
                res = await client.get(f"{AI_SERVICE_URL}/quiz/results/{submission_id}")
                if res.status_code == 200:
                    return res.json()
                elif res.status_code == 404:
                    print(f"    Still processing... ({int(asyncio.get_event_loop().time() - start)}s elapsed)")
                else:
                    print(f"    Unexpected status: {res.status_code}")
            except httpx.HTTPError as e:
                print(f"    Connection error: {e}")

            await asyncio.sleep(poll_interval)

    return None


async def main():
    print("=== AI Recommender Integration Test ===\n")

    all_passed = True

    try:
        # Step 1: Health check
        print("Step 1: Checking service health...")
        health_ok = await test_health_check()
        if not health_ok:
            print("\n=== Test Result ===")
            print("✗ FAIL: AI service is not healthy")
            print("  Make sure:")
            print("    - AI recommendation wrapper is running")
            print("    - GROQ_API_KEY and GEMINI_API_KEY are set")
            print("    - RabbitMQ is running and accessible")
            exit(1)

        # Step 2: Publish quiz event to RabbitMQ
        print("\nStep 2: Publishing quiz event to RabbitMQ...")
        submission_id, user_id = await publish_quiz_event()

        # Step 3: Wait for AI processing
        print("\nStep 3: Waiting for AI to process the quiz...")
        result = await wait_for_results(submission_id, timeout=60.0)

        if result is None:
            print("\n=== Test Result ===")
            print("✗ FAIL: AI did not produce results within timeout")
            print("  Check the AI service logs for errors")
            exit(1)

        # Step 4: Verify the result
        print("\nStep 4: Verifying result content...")
        checks = {
            "submission_id matches": result.get("submission_id") == submission_id,
            "has personality_type": result.get("personality_type") in [
                "Craftsman", "Workshop Goer", "Dreamer", "Free Spirit"
            ],
            "has solo_social_score": 0 <= (result.get("solo_social_score") or -1) <= 10,
            "has structured_freeform_score": 0 <= (result.get("structured_freeform_score") or -1) <= 10,
            "has recommendations": isinstance(result.get("recommendations"), list) and len(result["recommendations"]) == 3,
            "has answers": isinstance(result.get("answers"), list) and len(result["answers"]) > 0,
        }

        # Profile body / activity_explanations depend on Supabase schema having those columns.
        # Currently the full record insert fails and falls back to minimal storage.
        # The AI DOES generate these — it's a storage schema limitation.
        if result.get("profile_body"):
            checks["has profile_body"] = len(result["profile_body"]) > 20
        else:
            checks["has profile_body (stored)"] = False
            print("  ⚠ profile_body not stored — Supabase schema may be missing this column")

        if result.get("activity_explanations"):
            checks["has activity_explanations"] = len(result["activity_explanations"]) == 3
        else:
            checks["has activity_explanations (stored)"] = False
            print("  ⚠ activity_explanations not stored — Supabase schema may be missing this column")

        print()
        for check_name, passed in checks.items():
            status = "✓" if passed else "✗"
            print(f"  {status} {check_name}")
            if not passed:
                all_passed = False
                # Print actual value for debugging
                for key in ["personality_type", "solo_social_score", "structured_freeform_score",
                            "recommendations", "profile_title"]:
                    if key in result:
                        print(f"    {key}: {result[key]}")

        print("\n=== Test Result ===")
        if all(checks.values()):
            print(f"✓ SUCCESS: AI recommender is working correctly!")
            print(f"  - Quiz event was published to RabbitMQ")
            print(f"  - AI consumed and processed the event")
            print(f"  - Personality type: {result['personality_type']}")
            print(f"  - Scores: Solo↔Social={result['solo_social_score']}, Structured↔Freeform={result['structured_freeform_score']}")
            print(f"  - Recommendations: {result['recommendations']}")
            if result.get('profile_body'):
                print(f"  - Profile stored in Supabase ✓")
        else:
            failed = [k for k, v in checks.items() if not v]
            print(f"✗ FAIL: {len(failed)} check(s) failed: {failed}")
            exit(1)

    except httpx.HTTPError as e:
        print(f"✗ HTTP Error: {e}")
        exit(1)
    except asyncio.TimeoutError:
        print("✗ Timeout: Operation timed out")
        exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
