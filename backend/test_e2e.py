"""
End-to-end test for the AI Recommender Composite Service, Quiz Atomic Service, and AI Atomic Service.

Place this file at the ROOT of your project (same level as your docker-compose.yml).
Run with:  python test_e2e.py

The composite must be reachable at http://localhost:8000 (adjust BASE_URL below if yours differs).
All requests go through the composite — just like the real frontend client would.
"""

import asyncio
import json
import sys
import httpx

# ---------------------------------------------------------------------------
# Config — adjust if your services are on different hosts/ports
# ---------------------------------------------------------------------------
# Kong API Gateway (routes /quiz and /recommend to the composite)
BASE_URL = "http://localhost:8000"
# Direct composite port (used for /health and other non-Kong-routed endpoints)
COMPOSITE_DIRECT_URL = "http://localhost:8009"
TIMEOUT = 90.0  # generous timeout to cover AI inference time

# ---------------------------------------------------------------------------
# Fake user + answer templates
# NOTE: Actual question IDs come from the session response at runtime.
#       The quiz service randomly selects 8 questions (2 per category) from
#       the bank.  We build answer payloads dynamically using those IDs.
# ---------------------------------------------------------------------------
USER_ID = "test-user-001"

# Answer text keyed by category — used to generate answers for session questions.
# These are deliberately extreme to ensure the LLM scoring produces
# clearly differentiated personality profiles.

# Social + Freeform: pushes toward scores ~10/10 (Free Spirit)
ANSWER_TEMPLATES_SOCIAL_FREEFORM = {
    "food_and_drink": (
        "I always order extra to share with whoever's around — food is way more fun when "
        "everyone's trying different things together. I love discovering new dishes with a "
        "group and debating which one's best. I'd much rather eat with friends than alone."
    ),
    "activity_preferences": (
        "I want something fun and social where I can just jump in and create without "
        "following a strict tutorial. I'd rather be laughing with a group and figuring "
        "things out together than sitting quietly with step-by-step instructions."
    ),
    "ambience_and_vibe": (
        "I love a buzzing, lively café with lots of chatter and energy. Background noise "
        "and music make me feel alive — I'd hate somewhere dead silent. A busy, vibrant "
        "atmosphere is exactly what draws me in."
    ),
    "visit_style_and_occasion": (
        "I almost never plan — I just grab whoever's free and go somewhere spontaneous. "
        "I'm always discovering new spots through friends or just wandering around. "
        "I'd rather bring a crowd than go solo."
    ),
}

# Solo + Structured: pushes toward scores ~0/0 (Craftsman)
ANSWER_TEMPLATES_SOLO_STRUCTURED = {
    "food_and_drink": (
        "I always order the same thing — I know what I like and don't want surprises. "
        "I prefer eating alone with a book or my thoughts. Sharing food isn't really my thing; "
        "I come to cafés for quiet personal time, not social meals."
    ),
    "activity_preferences": (
        "I'd much rather have clear step-by-step guidance that I can follow at my own pace, "
        "ideally in a quiet, private setting. I want to learn a proper technique and produce "
        "something well-made — not just mess around with a group."
    ),
    "ambience_and_vibe": (
        "I need a calm, quiet café with soft music or no music at all. Loud chatter and "
        "background noise bother me — I come to cafés to focus and unwind in peace. "
        "A cozy, uncluttered space matters more than anything trendy."
    ),
    "visit_style_and_occasion": (
        "I always research cafés carefully beforehand and plan exactly when to go — usually "
        "on my own, during quiet hours. I stick to one or two places I trust and prefer "
        "short, purposeful visits over lingering."
    ),
}


def _build_answers_from_session(session_questions: list[dict], templates: dict) -> list[dict]:
    """Build answer payloads using real question IDs from a session response."""
    answers = []
    for q in session_questions:
        qid = q["question_id"]
        cat = q["category"]
        answers.append({
            "question_id": qid,
            "question_text": q["text"],
            "category": cat,
            "answer_text": templates.get(cat, "I enjoy exploring new things."),
        })
    return answers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def ok(label: str):
    print(f"  ✓  {label}")


def fail(label: str, detail: str = ""):
    print(f"  ✗  {label}")
    if detail:
        print(f"       {detail}")


def section(title: str):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


def pretty(data: dict) -> str:
    return json.dumps(data, indent=2)


def assert_field(data: dict, field: str, test_name: str) -> bool:
    """Assert that a field exists in the data."""
    if field in data and data[field] is not None:
        ok(f"{test_name}: '{field}' present")
        return True
    else:
        fail(f"{test_name}: '{field}' missing or null", str(data.get(field)))
        return False


def assert_field_equals(data: dict, field: str, expected, test_name: str) -> bool:
    """Assert that a field equals an expected value."""
    if data.get(field) == expected:
        ok(f"{test_name}: '{field}' == {expected}")
        return True
    else:
        fail(f"{test_name}: '{field}' != {expected}", f"got {data.get(field)}")
        return False


def assert_field_type(data: dict, field: str, expected_type, test_name: str) -> bool:
    """Assert that a field is of expected type."""
    value = data.get(field)
    if isinstance(value, expected_type):
        ok(f"{test_name}: '{field}' is {expected_type.__name__}")
        return True
    else:
        fail(f"{test_name}: '{field}' type mismatch", f"expected {expected_type.__name__}, got {type(value).__name__}")
        return False


def assert_field_range(data: dict, field: str, min_val: int, max_val: int, test_name: str) -> bool:
    """Assert that a numeric field is within a range."""
    value = data.get(field)
    if isinstance(value, (int, float)) and min_val <= value <= max_val:
        ok(f"{test_name}: '{field}' = {value} (in range [{min_val}, {max_val}])")
        return True
    else:
        fail(f"{test_name}: '{field}' out of range", f"expected [{min_val}, {max_val}], got {value}")
        return False


# ---------------------------------------------------------------------------
# Test: Health Check
# ---------------------------------------------------------------------------
async def test_health(client: httpx.AsyncClient) -> bool:
    """Test that composite and all atomics are reachable and healthy."""
    section("1 · Health Check — Composite + Quiz Atomic + AI Atomic")
    all_healthy = True

    # --- Check composite + its downstream atomics via composite /health ---
    try:
        # /health is not routed through Kong, so hit the composite directly
        res = await client.get(f"{COMPOSITE_DIRECT_URL}/health", timeout=10.0)
        print(f"  Composite health status: {res.status_code}")
        if res.status_code != 200:
            fail("Composite health check returned non-200", res.text[:300])
            all_healthy = False
        else:
            data = res.json()
            print(f"  Body: {pretty(data)}")

            # Check AI recommendation service health
            if "ai_recommendation" in data:
                ai_status = data["ai_recommendation"]
                if ai_status.get("status") == "healthy" or "status" not in ai_status:
                    ok("AI atomic is healthy (via composite)")
                else:
                    fail("AI atomic unhealthy", str(ai_status))
                    all_healthy = False
            else:
                fail("AI atomic missing from health response")
                all_healthy = False

            # The "quiz" entry in composite health is self-referential
            # (quiz-service IS the composite, not a separate atomic).
            # We verify the quiz atomic separately below.
    except httpx.ConnectError:
        fail("Could not connect to composite", f"Is the composite running at {COMPOSITE_DIRECT_URL}?")
        return False

    # --- Check quiz atomic directly (it is the quiz-service container itself) ---
    try:
        res = await client.get(f"http://localhost:8012/health", timeout=10.0)
        print(f"  Quiz-service direct status: {res.status_code}")
        if res.status_code == 200:
            ok("Quiz-service container is reachable (serves as quiz composite)")
        else:
            fail("Quiz-service returned non-200", res.text[:200])
            all_healthy = False
    except httpx.ConnectError:
        fail("Could not connect to quiz-service", "Is quiz-service running on port 8012?")
        all_healthy = False

    # --- Check AI atomic directly ---
    try:
        res = await client.get(f"http://localhost:8006/health", timeout=10.0)
        print(f"  AI atomic direct status: {res.status_code}")
        if res.status_code == 200:
            ok("AI atomic is reachable directly")
        else:
            fail("AI atomic returned non-200", res.text[:200])
            all_healthy = False
    except httpx.ConnectError:
        fail("Could not connect to AI atomic", "Is ai-recommendation-wrapper running on port 8006?")
        all_healthy = False

    return all_healthy


# ---------------------------------------------------------------------------
# Test: Quiz Session Lifecycle
# ---------------------------------------------------------------------------
async def test_create_session(client: httpx.AsyncClient) -> tuple[str, list] | tuple[None, None]:
    """Test creating a new quiz session. Returns (session_id, questions)."""
    section("2 · Create Quiz Session")
    payload = {"user_id": USER_ID}
    res = await client.post(f"{BASE_URL}/quiz/session", json=payload)
    print(f"  Status: {res.status_code}")

    if res.status_code not in (200, 201):
        fail("Failed to create session", res.text)
        return None, None

    data = res.json()
    if not assert_field(data, "session_id", "Create session"):
        fail("Response missing session_id", pretty(data))
        return None, None

    session_id = data["session_id"]
    ok(f"Session created: {session_id}")

    # Validate response structure
    assert_field(data, "user_id", "Create session")
    assert_field_equals(data, "user_id", USER_ID, "Create session")

    # Extract session questions for later answer submission
    questions = data.get("questions", [])
    if questions:
        ok(f"Session includes {len(questions)} question(s) with real IDs")

    return session_id, questions


async def test_get_session(client: httpx.AsyncClient, session_id: str) -> bool:
    """Test retrieving a quiz session by ID."""
    section("3 · Get Quiz Session")
    res = await client.get(f"{BASE_URL}/quiz/session/{session_id}")
    print(f"  Status: {res.status_code}")

    if res.status_code != 200:
        fail("Failed to get session", res.text)
        return False

    data = res.json()
    assert_field(data, "session_id", "Get session")
    assert_field_equals(data, "session_id", session_id, "Get session")
    assert_field(data, "user_id", "Get session")

    ok("Session retrieved successfully")
    return True


async def test_fetch_questions(client: httpx.AsyncClient) -> bool:
    """Test fetching available quiz questions."""
    section("4 · Fetch Quiz Questions")
    res = await client.get(f"{BASE_URL}/quiz/questions")
    print(f"  Status: {res.status_code}")

    if res.status_code != 200:
        fail("Failed to fetch questions", res.text)
        return False

    data = res.json()
    if not isinstance(data, list):
        fail("Questions response is not a list", pretty(data))
        return False

    count = len(data)
    ok(f"Received {count} question(s)")

    # Validate question structure
    if count > 0:
        q = data[0]
        assert_field(q, "question_id", "Question structure")
        assert_field(q, "text", "Question structure")
        assert_field(q, "category", "Question structure")
        ok("Question structure validated")

    return True


async def test_fetch_questions_by_category(client: httpx.AsyncClient) -> bool:
    """Test fetching quiz questions filtered by category."""
    section("5 · Fetch Quiz Questions by Category")
    res = await client.get(f"{BASE_URL}/quiz/questions", params={"category": "social"})
    print(f"  Status: {res.status_code}")

    if res.status_code != 200:
        fail("Failed to fetch questions by category", res.text)
        return False

    data = res.json()
    if not isinstance(data, list):
        fail("Questions response is not a list", pretty(data))
        return False

    count = len(data)
    ok(f"Received {count} question(s) for category 'social'")

    # Validate all questions match the category
    for q in data:
        if q.get("category") != "social":
            fail(f"Question {q.get('id')} has wrong category", f"expected 'social', got '{q.get('category')}'")
            return False

    ok("All questions match the requested category")
    return True


# ---------------------------------------------------------------------------
# Test: Answer Submission Workflow
# ---------------------------------------------------------------------------
async def test_submit_answers(client: httpx.AsyncClient, session_id: str, session_questions: list, templates: dict) -> bool:
    """Test submitting answers for all session questions."""
    section("6 · Submit Quiz Answers")
    answers = _build_answers_from_session(session_questions, templates)
    all_ok = True
    for i, answer in enumerate(answers, 1):
        res = await client.post(
            f"{BASE_URL}/quiz/session/{session_id}/answer", json=answer
        )
        if res.status_code in (200, 201):
            ok(f"Answer {i}/{len(answers)} accepted (q={answer['question_id']})")
        else:
            fail(f"Answer {i}/{len(answers)} rejected", res.text)
            all_ok = False
    return all_ok


async def test_edit_answer(client: httpx.AsyncClient, session_id: str, session_questions: list) -> bool:
    """Test editing a previously submitted answer."""
    section("7 · Edit Quiz Answer")
    # Pick the first question from the session and submit an answer
    if not session_questions:
        fail("No session questions available for edit test")
        return False

    first_q = session_questions[0]
    answer = {
        "question_id": first_q["question_id"],
        "question_text": first_q["text"],
        "category": first_q["category"],
        "answer_text": "Original answer",
    }
    res = await client.post(
        f"{BASE_URL}/quiz/session/{session_id}/answer", json=answer
    )
    if res.status_code not in (200, 201):
        fail("Could not submit initial answer for edit test", res.text)
        return False

    # Now edit it
    edit_payload = {
        "question_id": answer["question_id"],
        "answer_text": "Edited answer — this is my updated response",
    }
    res = await client.put(
        f"{BASE_URL}/quiz/session/{session_id}/answer/{answer['question_id']}",
        json=edit_payload,
    )
    print(f"  Status: {res.status_code}")

    if res.status_code not in (200, 201):
        fail("Failed to edit answer", res.text)
        return False

    data = res.json()
    ok("Answer edited successfully")
    return True


async def test_check_progress(client: httpx.AsyncClient, session_id: str) -> bool:
    """Test checking quiz session progress."""
    section("8 · Check Quiz Progress")
    res = await client.get(f"{BASE_URL}/quiz/session/{session_id}/progress")
    print(f"  Status: {res.status_code}")

    if res.status_code != 200:
        fail("Could not fetch progress", res.text)
        return False

    data = res.json()
    print(f"  Progress payload: {pretty(data)}")

    assert_field(data, "session_id", "Progress check")
    assert_field(data, "answered_count", "Progress check")

    ok("Progress endpoint responsive and returns valid data")
    return True


# ---------------------------------------------------------------------------
# Test: Core Orchestration — Submit + AI Recommendation
# ---------------------------------------------------------------------------
async def test_submit_and_recommend(client: httpx.AsyncClient, session_id: str, test_label: str = "") -> dict | None:
    """Test the full orchestration: submit quiz → get AI recommendation."""
    label = f"9 · Submit Session → AI Recommendation ({test_label})" if test_label else "9 · Submit Session → AI Recommendation"
    section(label)
    print("  (this calls the composite orchestration route — may take up to 60 s)")

    try:
        res = await client.post(
            f"{BASE_URL}/quiz/session/{session_id}/submit",
            timeout=TIMEOUT,
        )
    except httpx.ReadTimeout:
        fail("Request timed out waiting for AI atomic", f"Timeout set to {TIMEOUT}s")
        return None

    print(f"  Status: {res.status_code}")
    if res.status_code != 200:
        fail("Submit+recommend failed", res.text[:500])
        return None

    data = res.json()

    # Validate top-level fields
    if not assert_field(data, "submission_id", "Submit+Recommend"):
        fail("Missing submission_id", pretty(data))
        return None

    if not assert_field(data, "user_id", "Submit+Recommend"):
        return None

    # Validate recommendation block
    rec = data.get("recommendation")
    if rec is None:
        fail("Missing recommendation block", pretty(data))
        return None

    ok(f"submission_id        : {data.get('submission_id')}")
    ok(f"user_id              : {data.get('user_id')}")
    ok(f"submitted_at         : {data.get('submitted_at')}")

    # Validate recommendation fields
    assert_field(rec, "personality_type", "Recommendation")
    assert_field(rec, "profile_title", "Recommendation")
    assert_field(rec, "profile_body", "Recommendation")
    assert_field(rec, "activity_explanations", "Recommendation")
    assert_field(rec, "recommendations", "Recommendation")
    assert_field(rec, "food_recommendations", "Recommendation")
    assert_field(rec, "food_recommendation_details", "Recommendation")
    assert_field(rec, "drink_recommendation", "Recommendation")
    assert_field(rec, "drink_recommendation_details", "Recommendation")
    assert_field(rec, "closing", "Recommendation")
    assert_field(rec, "confidence_score", "Recommendation")

    # Validate scores block
    scores = rec.get("scores", {})
    assert_field(scores, "solo_social", "Scores")
    assert_field(scores, "structured_freeform", "Scores")
    assert_field(scores, "reasoning", "Scores")

    # Validate score ranges (0-10)
    solo_score = scores.get("solo_social")
    structured_score = scores.get("structured_freeform")
    if solo_score is not None:
        assert_field_range(rec.get("scores", {}), "solo_social", 0, 10, "Scores")
    if structured_score is not None:
        assert_field_range(rec.get("scores", {}), "structured_freeform", 0, 10, "Scores")

    # Validate confidence score (0-1 range)
    confidence = rec.get("confidence_score")
    if confidence is not None:
        assert_field_range(rec, "confidence_score", 0.0, 1.0, "Recommendation")

    # Validate personality type is one of expected values
    personality = rec.get("personality_type")
    valid_personalities = ["Workshop Goer", "Free Spirit", "Craftsman", "Dreamer"]
    if personality in valid_personalities:
        ok(f"personality_type     : {personality} (valid)")
    else:
        fail(f"personality_type unexpected", f"got '{personality}', expected one of {valid_personalities}")

    # Validate recommendations is a list
    recommendations = rec.get("recommendations")
    if isinstance(recommendations, list):
        ok(f"recommendations      : {len(recommendations)} item(s)")
    else:
        fail("recommendations type mismatch", f"expected list, got {type(recommendations).__name__}")

    # Validate food recommendations is a list
    food_recs = rec.get("food_recommendations")
    if isinstance(food_recs, list):
        ok(f"food_recommendations : {len(food_recs)} item(s)")
    else:
        fail("food_recommendations type mismatch", f"expected list, got {type(food_recs).__name__}")

    ok("Full recommendation payload validated")
    return data


# ---------------------------------------------------------------------------
# Test: Submission Retrieval
# ---------------------------------------------------------------------------
async def test_retrieve_submission(client: httpx.AsyncClient, submission_id: str) -> bool:
    """Test retrieving a stored submission with merged recommendation."""
    section("10 · Retrieve Stored Submission")
    res = await client.get(f"{BASE_URL}/quiz/submissions/{submission_id}", timeout=15.0)
    print(f"  Status: {res.status_code}")

    if res.status_code != 200:
        fail("Could not retrieve submission", res.text)
        return False

    data = res.json()

    # Validate submission fields
    all_ok = True
    all_ok &= assert_field(data, "submission_id", "Retrieve submission")
    all_ok &= assert_field(data, "user_id", "Retrieve submission")
    all_ok &= assert_field(data, "answers", "Retrieve submission")

    # Check recommendation block is merged
    if "recommendation" in data:
        rec = data["recommendation"]
        ok("Submission returned with merged recommendation block")

        # Validate recommendation structure
        all_ok &= assert_field(rec, "personality_type", "Merged recommendation")
        all_ok &= assert_field(rec, "confidence", "Merged recommendation")
        all_ok &= assert_field(rec, "scores", "Merged recommendation")

        scores = rec.get("scores", {})
        all_ok &= assert_field(scores, "solo_social", "Merged scores")
        all_ok &= assert_field(scores, "structured_freeform", "Merged scores")
        all_ok &= assert_field(scores, "reasoning", "Merged scores")

        return all_ok
    else:
        fail("Submission returned but recommendation block is missing")
        return False


async def test_retrieve_raw_results(client: httpx.AsyncClient, submission_id: str) -> bool:
    """Test retrieving raw AI results from the AI atomic."""
    section("11 · Retrieve Raw AI Results")
    res = await client.get(f"{BASE_URL}/quiz/results/{submission_id}", timeout=15.0)
    print(f"  Status: {res.status_code}")

    if res.status_code == 404:
        fail(
            "Raw results not found",
            "Supabase may not be configured or the AI atomic did not store results",
        )
        return False

    if res.status_code == 503:
        fail(
            "Supabase not configured",
            "The AI atomic requires Supabase to store and retrieve results",
        )
        return False

    if res.status_code != 200:
        fail("Unexpected error fetching raw results", res.text)
        return False

    data = res.json()

    # Validate raw result structure
    all_ok = True
    all_ok &= assert_field(data, "submission_id", "Raw AI results")
    all_ok &= assert_field(data, "personality_type", "Raw AI results")
    all_ok &= assert_field(data, "solo_social_score", "Raw AI results")
    all_ok &= assert_field(data, "structured_freeform_score", "Raw AI results")
    all_ok &= assert_field(data, "profile_title", "Raw AI results")
    all_ok &= assert_field(data, "profile_body", "Raw AI results")
    all_ok &= assert_field(data, "recommendations", "Raw AI results")

    if all_ok:
        ok(f"Raw results retrieved — personality_type: {data.get('personality_type')}")
    return all_ok


# ---------------------------------------------------------------------------
# Test: Error Handling
# ---------------------------------------------------------------------------
async def test_invalid_session(client: httpx.AsyncClient) -> bool:
    """Test handling of invalid/non-existent session IDs."""
    section("12 · Error Handling — Invalid Session ID")
    res = await client.get(f"{BASE_URL}/quiz/session/nonexistent-session-id")
    print(f"  Status: {res.status_code}")

    if res.status_code in (400, 404, 422):
        ok("Invalid session ID properly handled")
        return True
    else:
        fail("Invalid session ID not properly handled", f"got status {res.status_code}")
        return False


async def test_submit_without_answers(client: httpx.AsyncClient, session_id: str) -> bool:
    """Test submitting a session with no answers."""
    section("13 · Error Handling — Submit Without Answers")
    res = await client.post(
        f"{BASE_URL}/quiz/session/{session_id}/submit",
        timeout=30.0,
    )
    print(f"  Status: {res.status_code}")

    # Should fail since no answers were submitted
    if res.status_code in (400, 422, 500):
        ok("Submit without answers properly rejected")
        return True
    else:
        fail("Submit without answers not properly handled", f"got status {res.status_code}")
        return False


async def test_retrieve_nonexistent_results(client: httpx.AsyncClient) -> bool:
    """Test retrieving results for a non-existent submission."""
    section("14 · Error Handling — Non-existent Results")
    res = await client.get(f"{BASE_URL}/quiz/results/nonexistent-submission-id", timeout=10.0)
    print(f"  Status: {res.status_code}")

    if res.status_code in (404, 500, 503):
        ok("Non-existent results properly handled")
        return True
    else:
        fail("Non-existent results not properly handled", f"got status {res.status_code}")
        return False


# ---------------------------------------------------------------------------
# Test: Multiple Personality Profiles
# ---------------------------------------------------------------------------
async def test_different_personality_profiles(client: httpx.AsyncClient) -> bool:
    """Test that different answer patterns produce different recommendations."""
    section("15 · Different Answer Patterns → Different Profiles")

    # Create session 1: Social + Freeform
    res1 = await client.post(f"{BASE_URL}/quiz/session", json={"user_id": "user-social-freeform"})
    if res1.status_code not in (200, 201):
        fail("Could not create session for social-freeform test", res1.text)
        return False
    data1_create = res1.json()
    session1 = data1_create.get("session_id")
    session1_questions = data1_create.get("questions", [])

    # Submit answers for session 1
    answers1 = _build_answers_from_session(session1_questions, ANSWER_TEMPLATES_SOCIAL_FREEFORM)
    for answer in answers1:
        await client.post(f"{BASE_URL}/quiz/session/{session1}/answer", json=answer)

    # Get recommendation for session 1
    res_rec1 = await client.post(f"{BASE_URL}/quiz/session/{session1}/submit", timeout=TIMEOUT)
    if res_rec1.status_code != 200:
        fail("Failed to get recommendation for social-freeform", res_rec1.text)
        return False
    data1 = res_rec1.json()
    personality1 = data1.get("recommendation", {}).get("personality_type")

    ok(f"Social+Freeform answers → personality: {personality1}")

    # Create session 2: Solo + Structured
    res2 = await client.post(f"{BASE_URL}/quiz/session", json={"user_id": "user-solo-structured"})
    if res2.status_code not in (200, 201):
        fail("Could not create session for solo-structured test", res2.text)
        return False
    data2_create = res2.json()
    session2 = data2_create.get("session_id")
    session2_questions = data2_create.get("questions", [])

    # Submit answers for session 2
    answers2 = _build_answers_from_session(session2_questions, ANSWER_TEMPLATES_SOLO_STRUCTURED)
    for answer in answers2:
        await client.post(f"{BASE_URL}/quiz/session/{session2}/answer", json=answer)

    # Get recommendation for session 2
    res_rec2 = await client.post(f"{BASE_URL}/quiz/session/{session2}/submit", timeout=TIMEOUT)
    if res_rec2.status_code != 200:
        fail("Failed to get recommendation for solo-structured", res_rec2.text)
        return False
    data2 = res_rec2.json()
    personality2 = data2.get("recommendation", {}).get("personality_type")

    ok(f"Solo+Structured answers → personality: {personality2}")

    # Compare personalities
    if personality1 != personality2:
        ok(f"Different answer patterns produced different personalities: {personality1} vs {personality2}")
        return True
    else:
        fail(
            "Different answer patterns produced same personality",
            f"both returned '{personality1}' — AI may not be differentiating properly",
        )
        return False


# ---------------------------------------------------------------------------
# Test: Idempotency (re-submit same session)
# ---------------------------------------------------------------------------
async def test_idempotent_recommendation(client: httpx.AsyncClient) -> bool:
    """Test that re-submitting the same session returns consistent results.
    
    NOTE: The quiz service clears sessions after submit, so we create a fresh
    session, submit answers, then test that the first submit works and the
    stored submission remains retrievable.
    """
    section("16 · Idempotency — Re-submit Same Session")

    # Create a fresh session for idempotency testing
    res_create = await client.post(f"{BASE_URL}/quiz/session", json={"user_id": "idempotency-user"})
    if res_create.status_code not in (200, 201):
        fail("Could not create session for idempotency test", res_create.text)
        return False
    create_data = res_create.json()
    session_id = create_data.get("session_id")
    session_questions = create_data.get("questions", [])

    # Submit all answers
    answers = _build_answers_from_session(session_questions, ANSWER_TEMPLATES_SOCIAL_FREEFORM)
    for answer in answers:
        await client.post(f"{BASE_URL}/quiz/session/{session_id}/answer", json=answer)

    # First submission
    res1 = await client.post(f"{BASE_URL}/quiz/session/{session_id}/submit", timeout=TIMEOUT)
    if res1.status_code != 200:
        fail("First submit failed", res1.text)
        return False
    data1 = res1.json()
    submission_id1 = data1.get("submission_id")
    personality1 = data1.get("recommendation", {}).get("personality_type")

    # Second submission attempt — session is cleared by design, so expect 404
    res2 = await client.post(f"{BASE_URL}/quiz/session/{session_id}/submit", timeout=TIMEOUT)
    if res2.status_code == 404:
        ok("Session cleared after first submit (expected behaviour)")
    elif res2.status_code == 200:
        data2 = res2.json()
        submission_id2 = data2.get("submission_id")
        personality2 = data2.get("recommendation", {}).get("personality_type")
        if submission_id1 == submission_id2:
            ok("Same submission_id returned (idempotent)")
        else:
            fail("Different submission_id returned", f"{submission_id1} vs {submission_id2}")
        if personality1 == personality2:
            ok(f"Same personality_type returned: {personality1}")
            return True
        else:
            fail("Different personality_type returned", f"{personality1} vs {personality2}")
            return False
    else:
        fail("Unexpected response on second submit", res2.text)
        return False

    # Verify the original submission is still retrievable (persistence idempotency)
    res_get = await client.get(f"{BASE_URL}/quiz/submissions/{submission_id1}", timeout=15.0)
    if res_get.status_code == 200:
        stored = res_get.json()
        stored_personality = stored.get("recommendation", {}).get("personality_type")
        if stored_personality == personality1:
            ok(f"Stored submission retrievable with same personality: {personality1}")
            return True
        else:
            fail("Stored submission has different personality", f"{stored_personality} vs {personality1}")
            return False
    else:
        fail("Could not retrieve stored submission", res_get.text)
        return False


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
async def main():
    print("\n" + "═" * 60)
    print("  AI Recommender Composite + Quiz Atomic + AI Atomic — E2E Test")
    print(f"  Kong Gateway: {BASE_URL}")
    print(f"  Composite (direct): {COMPOSITE_DIRECT_URL}")
    print("═" * 60)

    passed = 0
    failed = 0

    async with httpx.AsyncClient() as client:

        # -------------------------------------------------------------------
        # Phase 1: Health Check
        # -------------------------------------------------------------------
        if not await test_health(client):
            print("\n⛔  Aborting — services not reachable.\n")
            sys.exit(1)
        passed += 1

        # -------------------------------------------------------------------
        # Phase 2: Quiz Session Lifecycle
        # -------------------------------------------------------------------
        session_id, session_questions = await test_create_session(client)
        if not session_id:
            failed += 1
            print("\n⛔  Aborting — cannot continue without a session.\n")
            sys.exit(1)
        passed += 1

        if await test_get_session(client, session_id):
            passed += 1
        else:
            failed += 1

        if await test_fetch_questions(client):
            passed += 1
        else:
            failed += 1

        if await test_fetch_questions_by_category(client):
            passed += 1
        else:
            failed += 1

        # -------------------------------------------------------------------
        # Phase 3: Answer Submission Workflow
        # -------------------------------------------------------------------
        if await test_submit_answers(client, session_id, session_questions, ANSWER_TEMPLATES_SOCIAL_FREEFORM):
            passed += 1
        else:
            failed += 1

        if await test_edit_answer(client, session_id, session_questions):
            passed += 1
        else:
            failed += 1

        if await test_check_progress(client, session_id):
            passed += 1
        else:
            failed += 1

        # -------------------------------------------------------------------
        # Phase 4: Core Orchestration — Submit + AI Recommendation
        # -------------------------------------------------------------------
        result = await test_submit_and_recommend(client, session_id, "Social+Freeform")
        if result:
            passed += 1
            submission_id = result.get("submission_id")

            # -------------------------------------------------------------------
            # Phase 5: Submission Retrieval
            # -------------------------------------------------------------------
            if await test_retrieve_submission(client, submission_id):
                passed += 1
            else:
                failed += 1

            # -------------------------------------------------------------------
            # Phase 6: Raw AI Results
            # -------------------------------------------------------------------
            if await test_retrieve_raw_results(client, submission_id):
                passed += 1
            else:
                failed += 1

            # -------------------------------------------------------------------
            # Phase 7: Idempotency
            # -------------------------------------------------------------------
            if await test_idempotent_recommendation(client):
                passed += 1
            else:
                failed += 1
        else:
            failed += 1
            print("\n  Skipping retrieval and idempotency tests — no submission_id available.")
            failed += 3

        # -------------------------------------------------------------------
        # Phase 8: Error Handling
        # -------------------------------------------------------------------
        if await test_invalid_session(client):
            passed += 1
        else:
            failed += 1

        # Create a fresh session to test submit without answers
        empty_session_res = await client.post(f"{BASE_URL}/quiz/session", json={"user_id": "empty-user"})
        if empty_session_res.status_code in (200, 201):
            empty_session_id = empty_session_res.json().get("session_id")
            if await test_submit_without_answers(client, empty_session_id):
                passed += 1
            else:
                failed += 1
        else:
            failed += 1
            print("  ⚠  Skipping submit-without-answers test — could not create session")

        if await test_retrieve_nonexistent_results(client):
            passed += 1
        else:
            failed += 1

        # -------------------------------------------------------------------
        # Phase 9: Different Personality Profiles
        # -------------------------------------------------------------------
        if await test_different_personality_profiles(client):
            passed += 1
        else:
            failed += 1

    # ---------------------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------------------
    total = passed + failed
    print(f"\n{'═' * 60}")
    print(f"  Results: {passed}/{total} passed")
    if failed == 0:
        print("  ✅  All tests passed — full pipeline is working.")
    else:
        print(f"  ❌  {failed} test(s) failed — review output above.")
    print("═" * 60 + "\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
