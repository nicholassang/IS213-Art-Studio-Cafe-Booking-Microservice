#!/usr/bin/env python3
"""
Standalone RabbitMQ Connection Test for Quiz → AI Recommender pipeline.

This script:
1. Checks RabbitMQ server connectivity
2. Publishes a test quiz submission message (simulating quiz-service)
3. Verifies the AI recommender wrapper consumes and processes it
4. Reports queue status and results

Usage:
    python test_rabbitmq_connection.py
"""

import asyncio
import json
import sys
import time
import uuid
from datetime import datetime, timezone

import aio_pika
import httpx

# ── Configuration ─────────────────────────────────────────────────────────
RABBITMQ_URL = "amqp://guest:guest@localhost/"
QUIZ_EXCHANGE = "quiz_events"
QUIZ_QUEUE = "ai_recommendation_queue"
ROUTING_KEY = "quiz.submitted"

QUIZ_SERVICE_URL = "http://localhost:8012"
AI_SERVICE_URL = "http://localhost:8006"


# ── Helpers ───────────────────────────────────────────────────────────────
def print_section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def print_status(icon: str, text: str, color: str = ""):
    prefix = f"{color}" if color else ""
    reset = "\033[0m" if color else ""
    print(f"  {prefix}{icon}{reset} {text}")


# ── Step 1: Test RabbitMQ Connection ─────────────────────────────────────
async def test_rabbitmq_connection():
    print_section("STEP 1: Test RabbitMQ Connection")

    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL, timeout=10)
        print_status("✓", "Successfully connected to RabbitMQ", "\033[32m")

        channel = await connection.channel()

        # Declare exchange
        exchange = await channel.declare_exchange(
            QUIZ_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
        )
        print_status("✓", f"Exchange '{QUIZ_EXCHANGE}' declared", "\033[32m")

        # Just check connectivity — don't modify queue args (AI wrapper owns the queue)
        try:
            queue = await channel.declare_queue(QUIZ_QUEUE, durable=True)
            print_status("✓", f"Queue '{QUIZ_QUEUE}' exists", "\033[32m")
            print_status("", f"Pending messages: {queue.declaration_result.message_count}")
            print_status("", f"Active consumers: {queue.declaration_result.consumer_count}")
        except Exception as e:
            print_status("!", f"Queue check skipped: {e}", "\033[33m")

        await connection.close()
        return True

    except Exception as e:
        print_status("✗", f"Failed to connect to RabbitMQ: {e}", "\033[31m")
        return False


# ── Step 2: Publish Test Message (simulate quiz-service) ─────────────────
async def publish_test_message():
    print_section("STEP 2: Publish Test Quiz Submission")

    submission_id = str(uuid.uuid4())
    user_id = f"test-user-{uuid.uuid4().hex[:8]}"
    submitted_at = datetime.now(timezone.utc).isoformat()

    # Build a realistic test payload
    test_payload = {
        "submission_id": submission_id,
        "user_id": user_id,
        "answers": [
            {
                "question_id": "q_food_01",
                "question_text": "What's your ideal morning drink?",
                "category": "food_and_drink",
                "answer_text": "A strong black coffee, no sugar"
            },
            {
                "question_id": "q_food_02",
                "question_text": "Pick a snack to go with your drink",
                "category": "food_and_drink",
                "answer_text": "A buttery croissant"
            },
            {
                "question_id": "q_activity_01",
                "question_text": "What draws you to a café?",
                "category": "activity_preferences",
                "answer_text": "A quiet corner to read or journal"
            },
            {
                "question_id": "q_activity_02",
                "question_text": "How do you feel about group events?",
                "category": "activity_preferences",
                "answer_text": "I prefer solo time, but I don't mind watching from afar"
            },
            {
                "question_id": "q_ambience_01",
                "question_text": "Describe your ideal café vibe",
                "category": "ambience_and_vibe",
                "answer_text": "Dim lighting, soft jazz, smells like fresh bread"
            },
            {
                "question_id": "q_ambience_02",
                "question_text": "What's the music policy?",
                "category": "ambience_and_vibe",
                "answer_text": "Lo-fi beats or classical — nothing too loud"
            },
            {
                "question_id": "q_visit_01",
                "question_text": "How do you plan your café visits?",
                "category": "visit_style_and_occasion",
                "answer_text": "I just show up when the mood strikes"
            },
            {
                "question_id": "q_visit_02",
                "question_text": "What's the occasion?",
                "category": "visit_style_and_occasion",
                "answer_text": "No occasion — just me and my thoughts"
            },
        ],
        "submitted_at": submitted_at,
    }

    print_status("", f"Submission ID: {submission_id}")
    print_status("", f"User ID: {user_id}")
    print_status("", f"Answers: {len(test_payload['answers'])}")

    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL, timeout=10)
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            QUIZ_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
        )

        message = aio_pika.Message(
            body=json.dumps(test_payload).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )

        await exchange.publish(message, routing_key=ROUTING_KEY)
        print_status("✓", f"Message published to '{QUIZ_EXCHANGE}' with routing key '{ROUTING_KEY}'", "\033[32m")

        await connection.close()
        return submission_id, user_id

    except Exception as e:
        print_status("✗", f"Failed to publish message: {e}", "\033[31m")
        return None, None


# ── Step 3: Poll for AI Results ──────────────────────────────────────────
async def poll_for_results(submission_id: str, max_wait: int = 60):
    print_section("STEP 3: Wait for AI Processing")

    waited = 0
    while waited < max_wait:
        time.sleep(3)
        waited += 3

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{AI_SERVICE_URL}/quiz/results/{submission_id}")

            if res.status_code == 200:
                result = res.json()
                print_status("✓", "Results found!", "\033[32m")
                print_status("", f"Personality Type: {result.get('personality_type', 'N/A')}")
                print_status("", f"Solo↔Social Score: {result.get('solo_social_score', 'N/A')}/10")
                print_status("", f"Structured↔Freeform Score: {result.get('structured_freeform_score', 'N/A')}/10")

                if result.get("recommendations"):
                    print_status("", f"Recommendations: {', '.join(result['recommendations'])}")

                if result.get("confidence_score") is not None:
                    print_status("", f"Confidence: {result['confidence_score']:.0%}")

                return True
            elif res.status_code == 404:
                print_status(".", f"[{waited}s] Still processing...", "\033[33m")
            else:
                print_status("!", f"[{waited}s] Unexpected status: {res.status_code}", "\033[33m")

        except httpx.ConnectError:
            print_status("✗", f"[{waited}s] Cannot reach AI service at {AI_SERVICE_URL}", "\033[31m")
            return False

    print_status("!", f"Results not found after {max_wait}s", "\033[33m")
    return False


# ── Step 4: Check Queue Status ───────────────────────────────────────────
async def check_queue_status():
    print_section("STEP 4: RabbitMQ Queue Status")

    import subprocess

    # Use rabbitmqctl for accurate status without queue arg conflicts
    try:
        result = subprocess.run(
            ["docker", "exec", "rabbitmq", "rabbitmqctl", "list_queues", "name", "messages", "consumers"],
            capture_output=True, text=True
        )
        print(result.stdout)

        if "ai_recommendation_queue" in result.stdout:
            for line in result.stdout.strip().split("\n"):
                if "ai_recommendation_queue" in line:
                    parts = line.split()
                    if len(parts) >= 3:
                        msg_count = int(parts[1])
                        consumer_count = int(parts[2])
                        if msg_count > 0:
                            print_status("!", f"{msg_count} message(s) pending — consumer may be slow", "\033[33m")
                        else:
                            print_status("✓", "Queue is empty — messages being consumed", "\033[32m")
                        if consumer_count == 0:
                            print_status("✗", "No consumers active", "\033[31m")
                        else:
                            print_status("✓", f"{consumer_count} consumer(s) active", "\033[32m")
        else:
            print_status("!", "Queue not found", "\033[33m")

    except Exception as e:
        print_status("✗", f"Failed to check queue status: {e}", "\033[31m")


# ── Step 5: Check Docker Logs ────────────────────────────────────────────
def check_docker_logs():
    print_section("STEP 5: Service Logs (RabbitMQ-related)")

    import subprocess

    for container, keywords in [
        ("quiz-service", ["RabbitMQ", "publish", "quiz.submitted"]),
        ("ai-recommendation-wrapper", ["Processing submission", "Scored:", "Profile generated", "RabbitMQ"]),
    ]:
        print(f"\n  --- {container} ---")
        try:
            result = subprocess.run(
                ["docker", "logs", container, "--since", "5m"],
                capture_output=True, text=True
            )
            logs = result.stderr

            relevant = [
                line.strip()
                for line in logs.split("\n")
                if any(kw in line for kw in keywords)
            ]

            if relevant:
                for line in relevant[-5:]:
                    print(f"    {line}")
            else:
                print("    (No relevant logs found)")

        except Exception as e:
            print(f"    Error reading logs: {e}")


# ── Main ─────────────────────────────────────────────────────────────────
async def main():
    print()
    print("  \033[1m\033[36m☕  RabbitMQ Connection Test — Quiz → AI Recommender\033[0m")
    print()

    # Step 1: Connection test
    conn_ok = await test_rabbitmq_connection()
    if not conn_ok:
        print("\n\033[31m✗ RabbitMQ connection failed. Aborting.\033[0m\n")
        sys.exit(1)

    # Step 2: Publish
    submission_id, user_id = await publish_test_message()
    if not submission_id:
        print("\n\033[31m✗ Failed to publish message. Aborting.\033[0m\n")
        sys.exit(1)

    # Step 3: Poll for results
    results_ok = await poll_for_results(submission_id)

    # Step 4: Queue status
    await check_queue_status()

    # Step 5: Logs
    check_docker_logs()

    # Check if AI processed even if Supabase doesn't have results
    import subprocess
    ai_logs = subprocess.run(
        ["docker", "logs", "ai-recommendation-wrapper", "--since", "2m"],
        capture_output=True, text=True
    ).stderr

    ai_processed = any(kw in ai_logs for kw in [
        f"Processing submission {submission_id}",
        f"Scored:",
        f"Profile generated"
    ])

    # Summary
    print_section("SUMMARY")
    if results_ok:
        print_status("✓", "RabbitMQ pipeline is working end-to-end!", "\033[32m")
        print_status("✓", "Message published → consumed → AI processed → stored in Supabase", "\033[32m")
    elif ai_processed:
        print_status("✓", "RabbitMQ pipeline is working! Message published and consumed by AI", "\033[32m")
        print_status("!", "Results not in Supabase — check the quiz_results table schema", "\033[33m")
        print_status("", "The AI successfully processed the message but storage failed.", "\033[33m")
        print_status("", "Check: docker logs ai-recommendation-wrapper | grep -i 'failed to store'", "\033[33m")
    else:
        print_status("!", "Message was published but AI results not found.", "\033[33m")
        print_status("", "Possible causes:", "\033[33m")
        print_status("", "  - AI service is still processing (check back later)")
        print_status("", "  - Groq/Gemini API keys are missing or invalid")
        print_status("", "  - AI consumer is not running")

    print()


if __name__ == "__main__":
    asyncio.run(main())
