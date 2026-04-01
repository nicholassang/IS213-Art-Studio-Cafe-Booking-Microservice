"""
Test script to verify quiz service sends enriched answers to RabbitMQ.

This script:
1. Submits a quiz via HTTP to the quiz service
2. Consumes the message from RabbitMQ to verify it contains question_text and option_text
"""

import asyncio
import json
import os
import aio_pika
import httpx

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
QUIZ_SERVICE_URL = os.getenv("QUIZ_SERVICE_URL", "http://localhost:8012")
QUIZ_EXCHANGE = "quiz_events"
QUIZ_QUEUE = "test_quiz_queue"
QUIZ_ROUTING_KEY = "quiz.submitted"


async def submit_quiz():
    """Submit a test quiz to the quiz service."""
    payload = {
        "user_id": "test-user-123",
        "answers": [
            {"question_id": "fd1", "selected_option_id": "fd1a"},
            {"question_id": "ap1", "selected_option_id": "ap1a"},
            {"question_id": "av1", "selected_option_id": "av1a"},
            {"question_id": "vs1", "selected_option_id": "vs1a"},
        ],
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{QUIZ_SERVICE_URL}/quiz/submit",
            json=payload,
        )
        response.raise_for_status()
        result = response.json()
        print(f"✓ Quiz submitted: submission_id={result['submission_id']}")
        return result


async def consume_message():
    """Consume one message from RabbitMQ and verify it contains enriched text."""
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
    """Verify the message contains enriched answer text."""
    print("\n--- Verifying Message Content ---")
    
    answers = message.get("answers", [])
    if not answers:
        print("✗ FAIL: No answers in message")
        return False

    all_ok = True
    for i, answer in enumerate(answers):
        print(f"\nAnswer {i + 1}:")
        
        has_qid = "question_id" in answer
        has_oid = "selected_option_id" in answer
        has_qtext = "question_text" in answer
        has_otext = "option_text" in answer

        print(f"  question_id: {answer.get('question_id', 'MISSING')}")
        print(f"  selected_option_id: {answer.get('selected_option_id', 'MISSING')}")
        print(f"  question_text: {answer.get('question_text', 'MISSING')}")
        print(f"  option_text: {answer.get('option_text', 'MISSING')}")

        if not (has_qid and has_oid and has_qtext and has_otext):
            print(f"  ✗ FAIL: Answer {i + 1} is missing required fields")
            all_ok = False
        else:
            print(f"  ✓ OK: All fields present")

    return all_ok


async def main():
    print("=== Quiz Integration Test ===\n")
    
    try:
        # Step 1: Submit quiz
        print("Step 1: Submitting quiz to quiz service...")
        await submit_quiz()
        
        # Step 2: Consume message from RabbitMQ
        print("\nStep 2: Consuming message from RabbitMQ...")
        message = await asyncio.wait_for(consume_message(), timeout=10.0)
        
        # Step 3: Verify enrichment
        print("\nStep 3: Verifying enriched answer data...")
        success = verify_enriched_answers(message)
        
        print("\n=== Test Result ===")
        if success:
            print("✓ SUCCESS: Quiz service sends enriched answers with question_text and option_text")
        else:
            print("✗ FAIL: Quiz service is NOT sending enriched answers")
            exit(1)
            
    except httpx.HTTPError as e:
        print(f"✗ HTTP Error: {e}")
        print("  Make sure quiz-service is running on port 8012")
        exit(1)
    except asyncio.TimeoutError:
        print("✗ Timeout: No message received from RabbitMQ within 10 seconds")
        print("  Make sure RabbitMQ is running on port 5672")
        exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
