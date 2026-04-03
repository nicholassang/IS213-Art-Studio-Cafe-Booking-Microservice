#!/usr/bin/env python3
"""Test RabbitMQ integration between quiz-service and ai-recommender-wrapper."""
import subprocess
import json
import time
import sys

QUIZ_URL = "http://localhost:8012"
AI_URL = "http://localhost:8006"

def curl(method, url, data=None):
    cmd = ["curl", "-s", "-X", method, url, "-H", "Content-Type: application/json"]
    if data is not None:
        cmd += ["-d", json.dumps(data)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

def get_logs(container, since="2m"):
    result = subprocess.run(
        ["docker", "logs", container, "--since", since],
        capture_output=True, text=True
    )
    return result.stderr  # docker logs go to stderr

def main():
    print("=" * 60)
    print("STEP 1: Create a new quiz session")
    print("=" * 60)
    session = curl("POST", f"{QUIZ_URL}/quiz/session", {"user_id": "rabbitmq-test-004"})
    session_id = session["session_id"]
    print(f"  Session ID: {session_id}")
    print(f"  Questions: {len(session['questions'])}")
    question_ids = [q["question_id"] for q in session["questions"]]

    print("\n" + "=" * 60)
    print("STEP 2: Submit answers for all questions")
    print("=" * 60)
    for qid in question_ids:
        resp = curl("POST", f"{QUIZ_URL}/quiz/session/{session_id}/answer",
                    {"question_id": qid, "answer_text": f"Test answer for {qid}"})
        print(f"  {qid}: {resp['answered_count']}/{resp['total_questions']}")

    print("\n" + "=" * 60)
    print("STEP 3: Check progress")
    print("=" * 60)
    progress = curl("GET", f"{QUIZ_URL}/quiz/session/{session_id}/progress")
    print(f"  All answered: {progress['all_answered']} ({progress['answered_count']}/{progress['total_questions']})")

    if not progress["all_answered"]:
        print("ERROR: Not all answers submitted!")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("STEP 4: Submit session (triggers RabbitMQ publish)")
    print("=" * 60)
    submit_resp = curl("POST", f"{QUIZ_URL}/quiz/session/{session_id}/submit")
    print(f"  Response: {json.dumps(submit_resp, indent=4)}")

    if "submission_id" not in submit_resp:
        print(f"ERROR: Submission failed! {submit_resp}")
        sys.exit(1)

    submission_id = submit_resp["submission_id"]
    print(f"  Submission ID: {submission_id}")

    # Wait for AI processing
    print("\n" + "=" * 60)
    print("STEP 5: Wait for AI processing (up to 60 seconds)")
    print("=" * 60)
    max_wait = 60
    polled = 0
    while polled < max_wait:
        time.sleep(5)
        polled += 5
        try:
            result = curl("GET", f"{AI_URL}/quiz/results/{submission_id}")
            if "submission_id" in result:
                print(f"\n  SUCCESS! Results found after {polled}s:")
                print(f"    Personality: {result.get('personality_type', 'N/A')}")
                print(f"    Solo/Social Score: {result.get('solo_social_score', 'N/A')}")
                print(f"    Structured/Freeform Score: {result.get('structured_freeform_score', 'N/A')}")
                print(f"    Recommendations: {result.get('recommendations', 'N/A')}")
                break
        except Exception:
            print(f"  [{polled}s] Still processing...")

    if polled >= max_wait:
        print(f"  WARNING: Results not found after {max_wait}s")

    print("\n" + "=" * 60)
    print("STEP 6: Check RabbitMQ logs")
    print("=" * 60)

    print("\n--- Quiz Service Logs (publish side) ---")
    quiz_logs = get_logs("quiz-service")
    publish_logs = [line for line in quiz_logs.split("\n") if "RabbitMQ" in line or "publish" in line.lower() or "quiz.submitted" in line]
    if publish_logs:
        for line in publish_logs[-5:]:
            print(f"  {line}")
    else:
        print("  (No RabbitMQ publish logs found - may be using print() without flush)")
        # Check if the 201 was returned, which means it went through
        if "submit" in quiz_logs:
            print("  Submit endpoint was called. Checking for 'Failed to publish' errors...")
            errors = [line for line in quiz_logs.split("\n") if "Failed to publish" in line]
            if errors:
                for e in errors:
                    print(f"  ERROR: {e}")
            else:
                print("  No 'Failed to publish' errors found - likely published successfully.")

    print("\n--- AI Recommender Logs (consume side) ---")
    ai_logs = get_logs("ai-recommendation-wrapper")
    consume_logs = [line for line in ai_logs.split("\n") if any(kw in line for kw in [
        "Processing submission", "Scored:", "Profile generated",
        "Stored result", "Done:", "RabbitMQ", "quiz"
    ])]
    if consume_logs:
        for line in consume_logs[-10:]:
            print(f"  {line}")
    else:
        print("  (No consumption logs found yet)")

    print("\n" + "=" * 60)
    print("STEP 7: Check RabbitMQ queue status")
    print("=" * 60)
    result = subprocess.run(
        ["docker", "exec", "rabbitmq", "rabbitmqctl", "list_queues", "name", "messages", "consumers"],
        capture_output=True, text=True
    )
    print(result.stdout)

if __name__ == "__main__":
    main()
