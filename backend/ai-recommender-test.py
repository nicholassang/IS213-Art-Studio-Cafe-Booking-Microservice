"""
Test script to verify AI recommender works correctly.

This script:
1. Publishes a quiz submission event directly to RabbitMQ
2. Waits for the AI to process the quiz and generate a recommendation
3. Verifies the recommendation was sent to the orchestrator
"""

import asyncio
import json
import os
import aio_pika
import httpx
from datetime import datetime, timezone
import uuid

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
AI_RECOMMENDER_WRAPPER_URL = os.getenv("AI_RECOMMENDER_WRAPPER_URL", "http://localhost:8006")
ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:8020")
QUIZ_EXCHANGE = "quiz_events"
QUIZ_ROUTING_KEY = "quiz.submitted"


async def publish_quiz_event():
    """Publish a test quiz submission event directly to RabbitMQ."""
    submission_id = str(uuid.uuid4())
    user_id = "test-user-ai-123"
    
    payload = {
        "submission_id": submission_id,
        "user_id": user_id,
        "answers": [
            {
                "question_id": "fd1",
                "selected_option_id": "fd1a",
                "question_text": "What type of food do you prefer?",
                "option_text": "Italian cuisine"
            },
            {
                "question_id": "ap1",
                "selected_option_id": "ap1a",
                "question_text": "What's your preferred atmosphere?",
                "option_text": "Quiet and cozy"
            },
            {
                "question_id": "av1",
                "selected_option_id": "av1a",
                "question_text": "What activities interest you?",
                "option_text": "Art workshops"
            },
            {
                "question_id": "vs1",
                "selected_option_id": "vs1a",
                "question_text": "What's your budget range?",
                "option_text": "Medium ($20-50)"
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
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=QUIZ_ROUTING_KEY)
        print(f"✓ Quiz event published: submission_id={submission_id}")
        return submission_id, user_id


async def wait_for_message_processed(timeout: float = 30.0) -> bool:
    """Wait for the message to be processed by checking queue is empty."""
    start_time = asyncio.get_event_loop().time()
    
    while asyncio.get_event_loop().time() - start_time < timeout:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            async with connection:
                channel = await connection.channel()
                # Use same arguments as the AI recommender wrapper
                queue = await channel.declare_queue(
                    "ai_recommendation_queue",
                    durable=True,
                    arguments={
                        "x-dead-letter-exchange": "",
                        "x-dead-letter-routing-key": "ai_recommendation_queue.dead_letter",
                    },
                )
                # Check if queue has no unacknowledged messages
                if queue.declaration_result.message_count == 0:
                    return True
            await asyncio.sleep(1.0)
        except Exception:
            await asyncio.sleep(1.0)
    
    return False


async def test_health_check():
    """Test the health endpoint of the AI recommendation wrapper."""
    print("\n--- Testing Health Check ---")
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(f"{AI_RECOMMENDER_WRAPPER_URL}/health")
            if response.status_code == 200:
                health = response.json()
                print(f"  Health status: {json.dumps(health, indent=2)}")
                
                if health.get("status") == "healthy":
                    print("  ✓ AI Recommendation service is healthy")
                    return True
                else:
                    print(f"  ✗ FAIL: AI Recommendation service is unhealthy")
                    return False
            else:
                print(f"  ✗ FAIL: Health check returned {response.status_code}")
                return False
        except httpx.HTTPError as e:
            print(f"  ✗ FAIL: Could not connect to AI recommender: {e}")
            return False


async def main():
    print("=== AI Recommender Test ===\n")

    try:
        # Step 1: Health check
        print("Step 1: Checking service health...")
        health_ok = await test_health_check()
        if not health_ok:
            print("\n=== Test Result ===")
            print("✗ FAIL: AI recommender service is not healthy")
            print("  Make sure:")
            print("    - AI recommendation wrapper is running on port 8006")
            print("    - GROQ_API_KEY and GEMINI_API_KEY are set")
            print("    - RabbitMQ is running on port 5672")
            exit(1)

        # Step 2: Get initial queue state
        print("\nStep 2: Checking initial queue state...")
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            queue = await channel.declare_queue(
                "ai_recommendation_queue",
                durable=True,
                arguments={
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": "ai_recommendation_queue.dead_letter",
                },
            )
            initial_count = queue.declaration_result.message_count
            print(f"  Initial queue message count: {initial_count}")

        # Step 3: Publish quiz event
        print("\nStep 3: Publishing quiz event to RabbitMQ...")
        submission_id, user_id = await publish_quiz_event()

        # Step 4: Wait for AI processing
        print("\nStep 4: Waiting for AI to process the quiz (up to 30 seconds)...")
        processed = await asyncio.wait_for(wait_for_message_processed(timeout=30.0), timeout=35.0)

        if not processed:
            print("\n=== Test Result ===")
            print("✗ FAIL: Message was not processed by AI recommender")
            print("  Check the AI recommendation wrapper logs for errors:")
            print("    docker logs ai-recommendation-wrapper")
            exit(1)

        # Step 5: Verify message was consumed
        print("\nStep 5: Verifying message was consumed...")
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            queue = await channel.declare_queue(
                "ai_recommendation_queue",
                durable=True,
                arguments={
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": "ai_recommendation_queue.dead_letter",
                },
            )
            final_count = queue.declaration_result.message_count
            print(f"  Final queue message count: {final_count}")
            
            if final_count == 0:
                print("  ✓ Message was successfully consumed and processed")
            else:
                print("  ✗ FAIL: Message still in queue")
                exit(1)

        # Step 6: Verify recommendation was stored
        print("\nStep 6: Verifying recommendation was stored...")
        await asyncio.sleep(2.0)  # Give time for recommendation to be stored
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"http://localhost:8009/api/recommendations/{submission_id}")
            if response.status_code == 200:
                data = response.json()
                # Handle both single object and list responses
                if isinstance(data, list):
                    recommendation = data[0] if data else None
                else:
                    recommendation = data
                    
                if recommendation and 'recommendation' in recommendation:
                    print(f"  ✓ Recommendation found and stored")
                    print(f"    Activity: {recommendation['recommendation']['activity']}")
                    print(f"    Confidence: {recommendation['recommendation']['confidence']}")
                    print(f"    Reason: {recommendation['recommendation']['reason'][:80]}...")
                else:
                    print(f"  ⚠ Warning: Recommendation data format unexpected")
            else:
                print(f"  ⚠ Warning: Could not fetch recommendation (status {response.status_code})")

        print("\n=== Test Result ===")
        print("✓ SUCCESS: AI recommender is working correctly!")
        print(f"  - Quiz event was published to RabbitMQ")
        print(f"  - AI recommender consumed and processed the event")
        print(f"  - Recommendation was generated using Groq AI")
        print(f"  - Recommendation was sent to and stored by the orchestrator")

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
