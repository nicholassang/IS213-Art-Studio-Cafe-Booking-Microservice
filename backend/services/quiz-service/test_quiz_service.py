"""
Comprehensive test suite for the Quiz Service.

Covers:
- Question bank validation
- Question randomization (2 per category, 8 total)
- Session lifecycle (create, retrieve, answer, edit, progress, submit)
- Input validation (empty answers, invalid question IDs)
- Endpoint availability and correct HTTP methods

Run: pytest test_quiz_service.py -v
"""

import json
import sys
import os
from unittest.mock import MagicMock, AsyncMock

# ── Mock heavy external dependencies before importing main ───────────────
mock_supabase = MagicMock()
mock_supabase_instance = MagicMock()
mock_supabase.create_client.return_value = mock_supabase_instance

sys.modules.setdefault("supabase", mock_supabase)
sys.modules.setdefault("aio_pika", MagicMock())
sys.modules.setdefault("aio_pika.abc", MagicMock())

sys.path.insert(0, os.path.dirname(__file__))

# Import the app — supabase client is already mocked at module level
from main import app, _sessions, TOTAL_QUESTIONS, CATEGORIES, QUESTION_BANK

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def clean_sessions():
    """Clear in-memory sessions before and after each test."""
    _sessions.clear()
    yield
    _sessions.clear()


@pytest.fixture
def mock_supabase(monkeypatch):
    """Replace the module-level supabase client with a mock."""
    m = MagicMock()
    monkeypatch.setattr("main.supabase", m)
    return m


@pytest.fixture
def mock_publish(monkeypatch):
    """Replace the module-level _publish function with an async mock."""
    m = AsyncMock()
    monkeypatch.setattr("main._publish", m)
    return m


# ──────────────────────────────────────────────────────────────
# Question Bank Tests
# ──────────────────────────────────────────────────────────────

class TestQuestionBank:
    def test_question_bank_has_40_questions(self):
        assert len(QUESTION_BANK) == 40

    def test_all_categories_present(self):
        categories = {q["category"] for q in QUESTION_BANK}
        assert categories == set(CATEGORIES)

    def test_each_category_has_10_questions(self):
        for category in CATEGORIES:
            count = sum(1 for q in QUESTION_BANK if q["category"] == category)
            assert count == 10, f"Category {category} has {count} questions, expected 10"

    def test_all_questions_have_required_fields(self):
        for q in QUESTION_BANK:
            assert "question_id" in q
            assert "text" in q
            assert "category" in q
            assert "options" in q
            assert isinstance(q["options"], list)
            assert len(q["options"]) > 0

    def test_all_question_ids_are_unique(self):
        ids = [q["question_id"] for q in QUESTION_BANK]
        assert len(ids) == len(set(ids))

    def test_all_options_have_required_fields(self):
        for q in QUESTION_BANK:
            for opt in q["options"]:
                assert "option_id" in opt
                assert "text" in opt


# ──────────────────────────────────────────────────────────────
# GET /quiz/questions Tests
# ──────────────────────────────────────────────────────────────

class TestGetQuestions:
    def test_get_all_questions(self, client, clean_sessions):
        res = client.get("/quiz/questions")
        assert res.status_code == 200
        assert len(res.json()) == 40

    def test_get_questions_filtered_by_category(self, client, clean_sessions):
        res = client.get("/quiz/questions", params={"category": "food_and_drink"})
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 10
        assert all(q["category"] == "food_and_drink" for q in data)

    def test_get_questions_invalid_category(self, client, clean_sessions):
        res = client.get("/quiz/questions", params={"category": "nonexistent"})
        assert res.status_code == 200
        assert res.json() == []


# ──────────────────────────────────────────────────────────────
# POST /quiz/session Tests
# ──────────────────────────────────────────────────────────────

class TestStartSession:
    def test_start_session_returns_8_questions(self, client, clean_sessions):
        res = client.post("/quiz/session", json={"user_id": "user-1"})
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "user-1"
        assert "session_id" in data
        assert len(data["questions"]) == TOTAL_QUESTIONS
        assert data["answers"] == {}

    def test_start_session_selects_2_per_category(self, client, clean_sessions):
        res = client.post("/quiz/session", json={"user_id": "user-1"})
        data = res.json()
        categories_count = {}
        for q in data["questions"]:
            cat = q["category"]
            categories_count[cat] = categories_count.get(cat, 0) + 1
        for cat in CATEGORIES:
            assert categories_count[cat] == 2, f"Category {cat} has {categories_count.get(cat, 0)} questions"

    def test_start_session_unique_questions(self, client, clean_sessions):
        res = client.post("/quiz/session", json={"user_id": "user-1"})
        data = res.json()
        ids = [q["question_id"] for q in data["questions"]]
        assert len(ids) == len(set(ids))

    def test_start_session_missing_user_id(self, client, clean_sessions):
        res = client.post("/quiz/session", json={})
        assert res.status_code == 422

    def test_multiple_sessions_are_independent(self, client, clean_sessions):
        res1 = client.post("/quiz/session", json={"user_id": "user-1"})
        res2 = client.post("/quiz/session", json={"user_id": "user-2"})
        assert res1.json()["session_id"] != res2.json()["session_id"]


# ──────────────────────────────────────────────────────────────
# GET /quiz/session/{session_id} Tests
# ──────────────────────────────────────────────────────────────

class TestGetSession:
    def test_get_existing_session(self, client, clean_sessions):
        create_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session_id = create_res.json()["session_id"]

        res = client.get(f"/quiz/session/{session_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["session_id"] == session_id
        assert len(data["questions"]) == TOTAL_QUESTIONS

    def test_get_nonexistent_session(self, client, clean_sessions):
        res = client.get("/quiz/session/nonexistent-id")
        assert res.status_code == 404


# ──────────────────────────────────────────────────────────────
# POST /quiz/session/{session_id}/answer Tests
# ──────────────────────────────────────────────────────────────

class TestSubmitAnswer:
    def _create_session(self, client):
        res = client.post("/quiz/session", json={"user_id": "user-1"})
        return res.json()

    def test_submit_answer(self, client, clean_sessions):
        session = self._create_session(client)
        session_id = session["session_id"]
        qid = session["questions"][0]["question_id"]

        res = client.post(
            f"/quiz/session/{session_id}/answer",
            json={"question_id": qid, "answer_text": "I love espresso"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["answered_count"] == 1
        assert data["total_questions"] == TOTAL_QUESTIONS
        assert data["all_answered"] is False

    def test_submit_answer_overwrites(self, client, clean_sessions):
        session = self._create_session(client)
        session_id = session["session_id"]
        qid = session["questions"][0]["question_id"]

        client.post(
            f"/quiz/session/{session_id}/answer",
            json={"question_id": qid, "answer_text": "first answer"},
        )
        res = client.post(
            f"/quiz/session/{session_id}/answer",
            json={"question_id": qid, "answer_text": "second answer"},
        )
        assert res.status_code == 200

        get_res = client.get(f"/quiz/session/{session_id}")
        assert get_res.json()["answers"][qid] == "second answer"

    def test_submit_answer_invalid_question_id(self, client, clean_sessions):
        session = self._create_session(client)
        session_id = session["session_id"]

        res = client.post(
            f"/quiz/session/{session_id}/answer",
            json={"question_id": "not-in-session", "answer_text": "blah"},
        )
        assert res.status_code == 400

    def test_submit_answer_empty_text(self, client, clean_sessions):
        session = self._create_session(client)
        session_id = session["session_id"]
        qid = session["questions"][0]["question_id"]

        res = client.post(
            f"/quiz/session/{session_id}/answer",
            json={"question_id": qid, "answer_text": "   "},
        )
        assert res.status_code == 422

    def test_submit_all_answers_triggers_all_answered(self, client, clean_sessions):
        session = self._create_session(client)
        session_id = session["session_id"]

        for q in session["questions"]:
            res = client.post(
                f"/quiz/session/{session_id}/answer",
                json={"question_id": q["question_id"], "answer_text": f"Answer for {q['question_id']}"},
            )
            assert res.status_code == 200

        last_data = res.json()
        assert last_data["answered_count"] == TOTAL_QUESTIONS
        assert last_data["all_answered"] is True


# ──────────────────────────────────────────────────────────────
# PUT /quiz/session/{session_id}/answer/{question_id} Tests
# ──────────────────────────────────────────────────────────────

class TestEditAnswer:
    def _create_and_answer(self, client):
        session_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session = session_res.json()
        qid = session["questions"][0]["question_id"]
        client.post(
            f"/quiz/session/{session['session_id']}/answer",
            json={"question_id": qid, "answer_text": "original"},
        )
        return session["session_id"], qid

    def test_edit_answer(self, client, clean_sessions):
        session_id, qid = self._create_and_answer(client)

        res = client.put(
            f"/quiz/session/{session_id}/answer/{qid}",
            json={"question_id": qid, "answer_text": "edited answer"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["updated"] is True

        get_res = client.get(f"/quiz/session/{session_id}")
        assert get_res.json()["answers"][qid] == "edited answer"

    def test_edit_nonexistent_answer(self, client, clean_sessions):
        session_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session = session_res.json()
        qid = session["questions"][0]["question_id"]

        res = client.put(
            f"/quiz/session/{session['session_id']}/answer/{qid}",
            json={"question_id": qid, "answer_text": "no prior answer"},
        )
        assert res.status_code == 400

    def test_edit_invalid_question(self, client, clean_sessions):
        session_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session = session_res.json()

        res = client.put(
            f"/quiz/session/{session['session_id']}/answer/fake-qid",
            json={"question_id": "fake-qid", "answer_text": "nope"},
        )
        assert res.status_code == 400


# ──────────────────────────────────────────────────────────────
# GET /quiz/session/{session_id}/progress Tests
# ──────────────────────────────────────────────────────────────

class TestGetProgress:
    def test_progress_zero_answers(self, client, clean_sessions):
        res = client.post("/quiz/session", json={"user_id": "user-1"})
        session_id = res.json()["session_id"]

        progress = client.get(f"/quiz/session/{session_id}/progress")
        data = progress.json()
        assert data["answered_count"] == 0
        assert data["all_answered"] is False

    def test_progress_partial(self, client, clean_sessions):
        session_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session = session_res.json()
        session_id = session["session_id"]

        for q in session["questions"][:3]:
            client.post(
                f"/quiz/session/{session_id}/answer",
                json={"question_id": q["question_id"], "answer_text": "answer"},
            )

        progress = client.get(f"/quiz/session/{session_id}/progress")
        data = progress.json()
        assert data["answered_count"] == 3
        assert data["total_questions"] == TOTAL_QUESTIONS
        assert data["all_answered"] is False
        assert len(data["answered_question_ids"]) == 3

    def test_progress_complete(self, client, clean_sessions):
        session_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session = session_res.json()
        session_id = session["session_id"]

        for q in session["questions"]:
            client.post(
                f"/quiz/session/{session_id}/answer",
                json={"question_id": q["question_id"], "answer_text": "answer"},
            )

        progress = client.get(f"/quiz/session/{session_id}/progress")
        data = progress.json()
        assert data["answered_count"] == TOTAL_QUESTIONS
        assert data["all_answered"] is True


# ──────────────────────────────────────────────────────────────
# POST /quiz/session/{session_id}/submit Tests
# ──────────────────────────────────────────────────────────────

class TestSubmitSession:
    def _create_and_answer_all(self, client):
        session_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session = session_res.json()
        session_id = session["session_id"]
        for q in session["questions"]:
            client.post(
                f"/quiz/session/{session_id}/answer",
                json={"question_id": q["question_id"], "answer_text": f"Answer for {q['question_id']}"},
            )
        return session_id

    def test_submit_session_success(self, mock_supabase, mock_publish, client, clean_sessions):
        """Full submission saves to Supabase and publishes to RabbitMQ."""
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"submission_id": "test-sub-1"}]
        )

        session_id = self._create_and_answer_all(client)

        res = client.post(f"/quiz/session/{session_id}/submit")
        assert res.status_code == 201
        data = res.json()
        assert "submission_id" in data
        assert data["answer_count"] == TOTAL_QUESTIONS

        mock_publish.assert_called_once()

    def test_submit_session_incomplete_answers(self, client, clean_sessions):
        """Submitting with incomplete answers returns 400."""
        session_res = client.post("/quiz/session", json={"user_id": "user-1"})
        session = session_res.json()
        session_id = session["session_id"]

        for q in session["questions"][:2]:
            client.post(
                f"/quiz/session/{session_id}/answer",
                json={"question_id": q["question_id"], "answer_text": "answer"},
            )

        res = client.post(f"/quiz/session/{session_id}/submit")
        assert res.status_code == 400
        assert "2/8" in res.json()["detail"]

    def test_submit_nonexistent_session(self, client, clean_sessions):
        res = client.post("/quiz/session/nonexistent/submit")
        assert res.status_code == 404

    def test_session_removed_after_submit(self, mock_supabase, mock_publish, client, clean_sessions):
        """Session is removed from memory after successful submission."""
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"submission_id": "test-sub-1"}]
        )

        session_id = self._create_and_answer_all(client)
        assert session_id in _sessions

        client.post(f"/quiz/session/{session_id}/submit")

        assert session_id not in _sessions


# ──────────────────────────────────────────────────────────────
# GET /quiz/submissions/{submission_id} Tests
# ──────────────────────────────────────────────────────────────

class TestGetSubmission:
    def test_get_existing_submission(self, mock_supabase, client, clean_sessions):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"submission_id": "sub-123", "user_id": "user-1", "answers": []}]
        )

        res = client.get("/quiz/submissions/sub-123")
        assert res.status_code == 200
        assert res.json()["submission_id"] == "sub-123"

    def test_get_nonexistent_submission(self, mock_supabase, client, clean_sessions):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        res = client.get("/quiz/submissions/nonexistent")
        assert res.status_code == 404


# ──────────────────────────────────────────────────────────────
# Full Session Lifecycle Test
# ──────────────────────────────────────────────────────────────

class TestFullLifecycle:
    """End-to-end: create → answer all → submit → verify enrichment."""

    def test_full_lifecycle(self, mock_supabase, mock_publish, client, clean_sessions):
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"submission_id": "lifecycle-test"}]
        )

        # 1. Start session
        res = client.post("/quiz/session", json={"user_id": "lifecycle-user"})
        assert res.status_code == 200
        session = res.json()
        session_id = session["session_id"]
        assert len(session["questions"]) == TOTAL_QUESTIONS

        # 2. Check initial progress
        progress = client.get(f"/quiz/session/{session_id}/progress")
        assert progress.json()["answered_count"] == 0

        # 3. Answer each question one by one
        for i, q in enumerate(session["questions"]):
            res = client.post(
                f"/quiz/session/{session_id}/answer",
                json={"question_id": q["question_id"], "answer_text": f"Answer {i+1}"},
            )
            assert res.status_code == 200

        # 4. Verify progress is complete
        progress = client.get(f"/quiz/session/{session_id}/progress")
        assert progress.json()["all_answered"] is True

        # 5. Submit session
        submit_res = client.post(f"/quiz/session/{session_id}/submit")
        assert submit_res.status_code == 201

        # 6. Verify publish was called with correct routing key
        mock_publish.assert_called_once()
        call_args = mock_publish.call_args
        assert call_args[0][0] == "quiz.submitted"
        published_payload = call_args[0][1]
        assert published_payload["user_id"] == "lifecycle-user"
        assert len(published_payload["answers"]) == TOTAL_QUESTIONS

        # 7. Verify each answer has enriched data (question_text, category, answer_text)
        for answer in published_payload["answers"]:
            assert "question_id" in answer
            assert "question_text" in answer
            assert "category" in answer
            assert "answer_text" in answer

        # 8. Session should be cleaned up
        assert session_id not in _sessions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
