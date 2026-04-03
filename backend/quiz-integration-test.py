"""
Integration test for the Quiz Service → RabbitMQ → AI microservice pipeline.

This script:
1. Starts a quiz session via HTTP
2. Answers all questions one by one
3. Submits the session
4. Consumes the message from RabbitMQ
5. Verifies the enriched answer payload (question_text, category, answer_text)
"""

import asyncio
import json
import os
import aio_pika
import httpx

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
QUIZ_SERVICE_URL = os.getenv("QUIZ_SERVICE_URL", "http://localhost:8000")
QUIZ_EXCHANGE = "quiz_events"
QUIZ_QUEUE = "test_quiz_integration_queue"
QUIZ_ROUTING_KEY = "quiz.submitted"


async def start_quiz_session(user_id="test-user"):
    """Start a new quiz session and return session data."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{QUIZ_SERVICE_URL}/quiz/session",
            json={"user_id": user_id},
        )
        response.raise_for_status()
        return response.json()


async def answer_question(session_id, question_id, answer_text):
    """Submit an answer for a specific question."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{QUIZ_SERVICE_URL}/quiz/session/{session_id}/answer",
            json={"question_id": question_id, "answer_text": answer_text},
        )
        response.raise_for_status()
        return response.json()


async def submit_session(session_id):
    """Finalize and submit the quiz session."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{QUIZ_SERVICE_URL}/quiz/session/{session_id}/submit",
        )
        response.raise_for_status()
        return response.json()


async def consume_quiz_message():
    """Consume one message from RabbitMQ and return the parsed body."""
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            QUIZ_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
        )
        queue = await channel.declare_queue(QUIZ_QUEUE, durable=True, auto_delete=True)
        await queue.bind(exchange, routing_key=QUIZ_ROUTING_KEY)

        print("Waiting for quiz message from RabbitMQ...")
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    body = json.loads(message.body.decode())
                    print(f"✓ Message received from RabbitMQ")
                    return body


def verify_enriched_answers(message):
    """Verify the message contains enriched answer data."""
    print("\n--- Verifying Message Content ---")

    answers = message.get("answers", [])
    if not answers:
        print("✗ FAIL: No answers in message")
        return False

    required_fields = ["question_id", "question_text", "category", "answer_text"]
    all_ok = True

    for i, answer in enumerate(answers):
        print(f"\nAnswer {i + 1}:")
        for field in required_fields:
            value = answer.get(field, "MISSING")
            print(f"  {field}: {value}")

        missing = [f for f in required_fields if f not in answer]
        if missing:
            print(f"  ✗ FAIL: Missing fields: {missing}")
            all_ok = False
        else:
            print(f"  ✓ OK: All required fields present")

    return all_ok


async def main():
    print("=== Quiz Service Integration Test ===\n")

    try:
        # Step 1: Start session
        print("Step 1: Starting quiz session...")
        session = await start_quiz_session()
        session_id = session["session_id"]
        questions = session["questions"]
        print(f"✓ Session created: session_id={session_id}, questions={len(questions)}")

        # Step 2: Answer all questions
        print(f"\nStep 2: Answering all {len(questions)} questions...")
        for i, q in enumerate(questions):
            result = await answer_question(session_id, q["question_id"], f"Test answer for {q['question_id']}")
            print(f"  ✓ Q{i+1} ({q['question_id']}): answered ({result['answered_count']}/{result['total_questions']})")

        # Step 3: Submit session
        print("\nStep 3: Submitting quiz session...")
        submit_result = await submit_session(session_id)
        print(f"✓ Session submitted: submission_id={submit_result['submission_id']}")

        # Step 4: Consume message from RabbitMQ
        print("\nStep 4: Consuming message from RabbitMQ...")
        message = await asyncio.wait_for(consume_quiz_message(), timeout=10.0)

        # Step 5: Verify enriched answers
        print("\nStep 5: Verifying enriched answer data...")
        success = verify_enriched_answers(message)

        print("\n=== Test Result ===")
        if success:
            print("✓ SUCCESS: Quiz service sends enriched answers with question_text, category, and answer_text")
        else:
            print("✗ FAIL: Quiz service is NOT sending enriched answers")
            exit(1)

    except httpx.HTTPError as e:
        print(f"✗ HTTP Error: {e}")
        print(f"  Make sure quiz-service is running on {QUIZ_SERVICE_URL}")
        exit(1)
    except asyncio.TimeoutError:
        print("✗ Timeout: No message received from RabbitMQ within 10 seconds")
        print("  Make sure RabbitMQ is running and accessible")
        exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
