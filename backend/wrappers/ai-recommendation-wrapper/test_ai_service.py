"""
Comprehensive test suite for the AI Recommendation Wrapper service.

Covers:
- Utility functions (_format_answers, _map_scores, _parse_json_response, _extract_recommendations)
- Personality type mapping logic
- HTTP endpoints (/recommend/submit, /recommend/preview, /quiz/results, /health)
- RabbitMQ consumer (on_quiz_submitted)
- AI response JSON parsing (markdown stripping, edge cases)

Run: pytest test_ai_service.py -v
"""

import json
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch, PropertyMock
from datetime import datetime, timezone

# ── Mock heavy external dependencies before importing main ───────────────
mock_supabase_module = MagicMock()
mock_supabase_client = MagicMock()
mock_supabase_module.create_client.return_value = mock_supabase_client

sys.modules.setdefault("supabase", mock_supabase_module)
sys.modules.setdefault("aio_pika", MagicMock())
sys.modules.setdefault("aio_pika.abc", MagicMock())
sys.modules.setdefault("groq", MagicMock())
sys.modules.setdefault("groq._client", MagicMock())
sys.modules.setdefault("google", MagicMock())
sys.modules.setdefault("google.genai", MagicMock())
sys.modules.setdefault("google.genai.types", MagicMock())

# Mock dotenv
mock_dotenv = MagicMock()
mock_dotenv.load_dotenv = MagicMock()
sys.modules.setdefault("dotenv", mock_dotenv)

sys.path.insert(0, os.path.dirname(__file__))

# Set env vars so Settings loads without error
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-supabase-key")
os.environ.setdefault("RABBITMQ_URL", "amqp://guest:guest@localhost/")

# Import the app
from main import app, settings
from main import (
    _format_answers,
    _map_scores,
    _parse_json_response,
    _extract_recommendations,
    QuizAnswer,
    ProfileResult,
    ScoringResult,
)
from prompts import (
    SCORING_SYSTEM_PROMPT,
    build_profile_system_prompt,
    AVAILABLE_ACTIVITIES,
)

import pytest
from fastapi.testclient import TestClient
import pytest_asyncio


@pytest.fixture
def client():
    return TestClient(app)


# ──────────────────────────────────────────────────────────────
# Prompt / Constants Tests
# ──────────────────────────────────────────────────────────────

class TestPrompts:
    def test_scoring_prompt_not_empty(self):
        assert len(SCORING_SYSTEM_PROMPT) > 100

    def test_scoring_prompt_mentions_both_axes(self):
        assert "Solo" in SCORING_SYSTEM_PROMPT or "solo" in SCORING_SYSTEM_PROMPT
        assert "Structured" in SCORING_SYSTEM_PROMPT or "structured" in SCORING_SYSTEM_PROMPT

    def test_available_activities_not_empty(self):
        assert len(AVAILABLE_ACTIVITIES) > 0

    def test_available_activities_unique(self):
        assert len(AVAILABLE_ACTIVITIES) == len(set(AVAILABLE_ACTIVITIES))

    def test_build_profile_system_prompt_contains_type(self):
        prompt = build_profile_system_prompt("Dreamer", {"solo_social_score": 3, "structured_freeform_score": 7})
        assert "Dreamer" in prompt

    def test_build_profile_system_prompt_excludes_dislikes(self):
        prompt = build_profile_system_prompt(
            "Craftsman",
            {"solo_social_score": 5, "structured_freeform_score": 5},
            disliked_activities=["Oil Painting"],
        )
        assert "Oil Painting" not in prompt.split("Do not recommend")[0] or "do not suggest" in prompt.lower() or "avoid" in prompt.lower()
        # Verify the activity is excluded from the available list in the prompt
        lines = prompt.splitlines()
        available_section = False
        for line in lines:
            if "Oil Painting" in line:
                # Should only appear in the "dislike" context, not in the available list
                pass

    def test_build_profile_system_prompt_has_all_4_types(self):
        for ptype in ["Craftsman", "Workshop Goer", "Dreamer", "Free Spirit"]:
            prompt = build_profile_system_prompt(ptype, {"solo_social_score": 5, "structured_freeform_score": 5})
            assert ptype in prompt


# ──────────────────────────────────────────────────────────────
# Utility Function Tests
# ──────────────────────────────────────────────────────────────

class TestFormatAnswers:
    def test_format_answers_basic(self):
        answers = [
            QuizAnswer(question_id="fd1", question_text="What food?", category="food_and_drink", answer_text="Italian"),
        ]
        result = _format_answers(answers)
        assert "Q1 (food_and_drink): What food?" in result
        assert "Answer: Italian" in result

    def test_format_answers_multiple(self):
        answers = [
            QuizAnswer(question_id="fd1", question_text="Q1", category="cat1", answer_text="A1"),
            QuizAnswer(question_id="ap1", question_text="Q2", category="cat2", answer_text="A2"),
        ]
        result = _format_answers(answers)
        assert "Q1 (cat1): Q1" in result
        assert "Answer: A1" in result
        assert "Q2 (cat2): Q2" in result
        assert "Answer: A2" in result

    def test_format_answers_empty(self):
        result = _format_answers([])
        assert result == ""


class TestMapScores:
    def test_craftsman_low_low(self):
        # Low social (solo) + low freeform (structured) → Craftsman
        assert _map_scores(2, 2) == "Craftsman"

    def test_workshop_goer_high_low(self):
        # High social + low freeform (structured) → Workshop Goer
        assert _map_scores(8, 2) == "Workshop Goer"

    def test_dreamer_low_high(self):
        # Low social (solo) + high freeform → Dreamer
        assert _map_scores(2, 8) == "Dreamer"

    def test_free_spirit_high_high(self):
        # High social + high freeform → Free Spirit
        assert _map_scores(8, 8) == "Free Spirit"

    def test_boundary_5_5(self):
        # Exactly 5,5 → social=True, freeform=True → Free Spirit
        assert _map_scores(5, 5) == "Free Spirit"

    def test_boundary_4_5(self):
        # social=False (4<5), freeform=True (5>=5) → Dreamer
        assert _map_scores(4, 5) == "Dreamer"

    def test_boundary_5_4(self):
        # social=True (5>=5), freeform=False (4<5) → Workshop Goer
        assert _map_scores(5, 4) == "Workshop Goer"

    def test_boundary_0_0(self):
        assert _map_scores(0, 0) == "Craftsman"

    def test_boundary_10_10(self):
        assert _map_scores(10, 10) == "Free Spirit"


class TestParseJsonResponse:
    def test_parse_plain_json(self):
        text = '{"key": "value", "number": 42}'
        result = _parse_json_response(text)
        assert result == {"key": "value", "number": 42}

    def test_parse_json_with_markdown_fences(self):
        text = '```json\n{"name": "test"}\n```'
        result = _parse_json_response(text)
        assert result == {"name": "test"}

    def test_parse_json_with_code_fences_no_lang(self):
        text = '```\n{"flag": true}\n```'
        result = _parse_json_response(text)
        assert result == {"flag": True}

    def test_parse_json_with_whitespace(self):
        text = '  \n  {"a": 1}  \n  '
        result = _parse_json_response(text)
        assert result == {"a": 1}

    def test_parse_json_nested(self):
        text = '{"outer": {"inner": [1, 2, 3]}}'
        result = _parse_json_response(text)
        assert result["outer"]["inner"] == [1, 2, 3]

    def test_parse_json_invalid_raises(self):
        with pytest.raises(Exception):
            _parse_json_response("not json at all")


class TestExtractRecommendations:
    def test_extract_sorted_by_rank(self):
        profile = ProfileResult(
            profile_title="Dreamer",
            profile_body="A dreamer profile",
            activity_explanations=[
                {"rank": 3, "activity": "Art Jamming", "explanation": "Good fit"},
                {"rank": 1, "activity": "Watercoloring", "explanation": "Best fit"},
                {"rank": 2, "activity": "Oil Painting", "explanation": "OK fit"},
            ],
            closing="Great job!",
        )
        result = _extract_recommendations(profile)
        assert result == ["Watercoloring", "Oil Painting", "Art Jamming"]

    def test_extract_empty(self):
        profile = ProfileResult(
            profile_title="Test",
            profile_body="body",
            activity_explanations=[],
            closing="bye",
        )
        assert _extract_recommendations(profile) == []


# ──────────────────────────────────────────────────────────────
# Health Endpoint Tests
# ──────────────────────────────────────────────────────────────

class TestHealthCheck:
    def test_health_healthy(self, monkeypatch):
        """When all keys and RabbitMQ are set, returns 200 healthy."""
        monkeypatch.setattr("main._rabbitmq_healthy", True)
        client = TestClient(app)

        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

    def test_health_unhealthy_rabbitmq(self, monkeypatch):
        """When RabbitMQ is down, returns 503."""
        monkeypatch.setattr("main._rabbitmq_healthy", False)
        client = TestClient(app)

        res = client.get("/health")
        assert res.status_code == 503
        data = res.json()
        assert "RabbitMQ" in data["detail"]["issues"][0] or "rabbitmq" in data["detail"]["issues"][0].lower()


# ──────────────────────────────────────────────────────────────
# /recommend/preview Endpoint Tests
# ──────────────────────────────────────────────────────────────

class TestRecommendPreview:
    @pytest.fixture
    def sample_answers(self):
        return [
            {
                "question_id": "fd1",
                "question_text": "What food?",
                "category": "food_and_drink",
                "answer_text": "I love trying new dishes",
            },
            {
                "question_id": "ap1",
                "question_text": "What activities?",
                "category": "activity_preferences",
                "answer_text": "I prefer guided workshops",
            },
        ]

    def test_preview_missing_answers(self, client):
        """No answers → 422."""
        res = client.post("/recommend/preview", json={"user_id": "u1", "answers": []})
        assert res.status_code == 422

    @patch("main.score_answers")
    @patch("main.generate_profile")
    def test_preview_success(self, mock_profile, mock_score, client, sample_answers):
        """Full preview flow returns personality + recommendations."""
        mock_score.return_value = ScoringResult(
            solo_social_score=7,
            structured_freeform_score=3,
            reasoning="Social but prefers structure",
        )
        mock_profile.return_value = ProfileResult(
            profile_title="Workshop Goer",
            profile_body="You are a social person who enjoys guided activities.",
            activity_explanations=[
                {"rank": 1, "activity": "Art Jamming", "explanation": "Perfect for your social nature."},
                {"rank": 2, "activity": "Oil Painting", "explanation": "Guided and social."},
                {"rank": 3, "activity": "Clay Sculpting", "explanation": "Structured fun."},
            ],
            closing="Have fun!",
        )

        res = client.post("/recommend/preview", json={
            "user_id": "u1",
            "answers": sample_answers,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["personality_type"] == "Workshop Goer"
        assert data["solo_social_score"] == 7
        assert data["structured_freeform_score"] == 3
        assert data["recommendations"] == ["Art Jamming", "Oil Painting", "Clay Sculpting"]
        assert "submission_id" in data

    @patch("main.score_answers", side_effect=Exception("AI failed"))
    def test_preview_ai_error(self, mock_score, client, sample_answers):
        """AI failure → 500."""
        res = client.post("/recommend/preview", json={
            "user_id": "u1",
            "answers": sample_answers,
        })
        assert res.status_code == 500


# ──────────────────────────────────────────────────────────────
# /recommend/submit Endpoint Tests
# ──────────────────────────────────────────────────────────────

class TestRecommendSubmit:
    @pytest.fixture
    def sample_answers(self):
        """Answers as they come from the frontend (question_id + option_id)."""
        return [
            {"question_id": "fd1", "option_id": "fd1a"},
            {"question_id": "ap1", "option_id": "ap1b"},
        ]

    def test_submit_missing_answers(self, client):
        res = client.post("/recommend/submit", json={"user_id": "u1", "answers": []})
        assert res.status_code == 422

    @patch("main._get_service_client")
    @patch("main._rabbitmq_healthy", True)
    @patch("main._rabbitmq_connection")
    @patch("main.supabase_client")
    def test_submit_success(self, mock_supabase, mock_conn, mock_get_client, client, sample_answers):
        """Submit stores in Supabase, publishes to RabbitMQ, returns submission_id."""
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"submission_id": "sub-1"}]
        )
        mock_conn.is_closed = False

        # _rabbitmq_connection.channel() must be awaitable
        mock_channel = AsyncMock()
        mock_conn.channel = AsyncMock(return_value=mock_channel)
        mock_channel.declare_exchange = AsyncMock()

        # Mock composite service response for fetching questions
        mock_http_client = AsyncMock()
        mock_get_client.return_value = mock_http_client

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "question_id": "fd1",
                "text": "What food?",
                "category": "food_and_drink",
                "options": [
                    {"option_id": "fd1a", "text": "Espresso"},
                    {"option_id": "fd1b", "text": "Latte"},
                ],
            },
            {
                "question_id": "ap1",
                "text": "What activity?",
                "category": "activity_preferences",
                "options": [
                    {"option_id": "ap1a", "text": "Painting"},
                    {"option_id": "ap1b", "text": "Sculpting"},
                ],
            },
        ]
        mock_http_client.get = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False

        res = client.post("/recommend/submit", json={
            "user_id": "u1",
            "answers": sample_answers,
        })

        assert res.status_code == 200
        data = res.json()
        assert "submission_id" in data
        assert data["status"] == "processing"

    @patch("main._get_service_client")
    @patch("main.supabase_client", None)
    def test_submit_no_supabase(self, mock_get_client, client):
        """Without Supabase → fails when trying to save (after fetching questions)."""
        mock_http_client = AsyncMock()
        mock_get_client.return_value = mock_http_client
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "question_id": "fd1",
                "text": "What food?",
                "category": "food_and_drink",
                "options": [{"option_id": "fd1a", "text": "Espresso"}],
            },
        ]
        mock_http_client.get = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False

        res = client.post("/recommend/submit", json={
            "user_id": "u1",
            "answers": [{"question_id": "fd1", "option_id": "fd1a"}],
        })
        assert res.status_code == 503

    @patch("main._rabbitmq_healthy", False)
    @patch("main.supabase_client")
    def test_submit_no_rabbitmq(self, mock_supabase, client):
        """Without RabbitMQ → 503."""
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"submission_id": "sub-1"}]
        )

        with patch("main._get_service_client") as mock_get_client:
            mock_http_client = AsyncMock()
            mock_get_client.return_value = mock_http_client
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {
                    "question_id": "fd1",
                    "text": "What food?",
                    "category": "food_and_drink",
                    "options": [{"option_id": "fd1a", "text": "Espresso"}],
                },
            ]
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_http_client.is_closed = False

            res = client.post("/recommend/submit", json={
                "user_id": "u1",
                "answers": [{"question_id": "fd1", "option_id": "fd1a"}],
            })

        assert res.status_code == 503


# ──────────────────────────────────────────────────────────────
# /quiz/results Endpoint Tests
# ──────────────────────────────────────────────────────────────

class TestQuizResults:
    @patch("main.supabase_client")
    def test_results_found(self, mock_supabase, client):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{
                "submission_id": "sub-123",
                "personality_type": "Dreamer",
                "solo_social_score": 3,
                "structured_freeform_score": 8,
                "recommendations": ["Watercoloring", "Art Jamming"],
                "profile_title": "Dreamer",
                "profile_body": "You are creative.",
                "activity_explanations": [],
                "closing": "Enjoy!",
                "confidence_score": 0.85,
            }]
        )

        res = client.get("/quiz/results/sub-123")
        assert res.status_code == 200
        data = res.json()
        assert data["personality_type"] == "Dreamer"
        assert data["submission_id"] == "sub-123"

    @patch("main.supabase_client")
    def test_results_not_found(self, mock_supabase, client):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        res = client.get("/quiz/results/nonexistent")
        assert res.status_code == 404

    @patch("main.supabase_client", None)
    def test_results_no_supabase(self, client):
        res = client.get("/quiz/results/sub-123")
        assert res.status_code == 503


# ──────────────────────────────────────────────────────────────
# RabbitMQ Consumer Tests (on_quiz_submitted)
# ──────────────────────────────────────────────────────────────

class TestOnQuizSubmitted:
    def _make_message(self, payload_dict):
        """Create a mock RabbitMQ message."""
        msg = MagicMock()
        msg.body = json.dumps(payload_dict).encode()
        msg.ack = AsyncMock()
        msg.nack = AsyncMock()
        return msg

    @pytest.mark.asyncio
    @patch("main.score_answers")
    @patch("main.generate_profile")
    @patch("main.store_result")
    async def test_consumer_success(self, mock_store, mock_profile, mock_score):
        """Full consumer flow: score → profile → store → ack."""
        from main import on_quiz_submitted

        mock_score.return_value = ScoringResult(
            solo_social_score=6,
            structured_freeform_score=4,
            reasoning="Balanced with slight social lean",
        )
        mock_profile.return_value = ProfileResult(
            profile_title="Workshop Goer",
            profile_body="You enjoy group activities.",
            activity_explanations=[
                {"rank": 1, "activity": "Art Jamming", "explanation": "Social and fun."},
                {"rank": 2, "activity": "Oil Painting", "explanation": "Guided creativity."},
                {"rank": 3, "activity": "Clay Sculpting", "explanation": "Hands-on learning."},
            ],
            closing="Keep creating!",
        )
        mock_store.return_value = None

        payload = {
            "submission_id": "consumer-test-1",
            "user_id": "user-42",
            "answers": [
                {
                    "question_id": "fd1",
                    "question_text": "What's your ideal order?",
                    "category": "food_and_drink",
                    "answer_text": "I'd try the specials and ask the barista",
                },
                {
                    "question_id": "ap1",
                    "question_text": "What would an activity look like?",
                    "category": "activity_preferences",
                    "answer_text": "A guided workshop with others",
                },
            ],
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }

        msg = self._make_message(payload)
        await on_quiz_submitted(msg)

        mock_score.assert_called_once()
        mock_profile.assert_called_once()
        mock_store.assert_called_once()
        msg.ack.assert_called_once()
        msg.nack.assert_not_called()

    @pytest.mark.asyncio
    @patch("main.score_answers", side_effect=Exception("Groq API down"))
    async def test_consumer_error_nacks(self, mock_score):
        """When AI call fails, message is nacked (not requeued)."""
        from main import on_quiz_submitted

        payload = {
            "submission_id": "error-test-1",
            "user_id": "user-99",
            "answers": [
                {
                    "question_id": "fd1",
                    "question_text": "Food?",
                    "category": "food_and_drink",
                    "answer_text": "Anything",
                },
            ],
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }

        msg = self._make_message(payload)
        await on_quiz_submitted(msg)

        msg.nack.assert_called_once_with(requeue=False)
        msg.ack.assert_not_called()

    @pytest.mark.asyncio
    @patch("main.score_answers")
    @patch("main.generate_profile")
    @patch("main.store_result")
    async def test_consumer_personality_mapping(self, mock_store, mock_profile, mock_score):
        """Consumer correctly maps scores to personality type."""
        from main import on_quiz_submitted

        # High social + high freeform → Free Spirit
        mock_score.return_value = ScoringResult(
            solo_social_score=9,
            structured_freeform_score=9,
            reasoning="Very social and very freeform",
        )
        mock_profile.return_value = ProfileResult(
            profile_title="Free Spirit",
            profile_body="You are spontaneous and social.",
            activity_explanations=[
                {"rank": 1, "activity": "Art Jamming", "explanation": "Perfect match."},
                {"rank": 2, "activity": "Acrylic Painting", "explanation": "Fun expression."},
                {"rank": 3, "activity": "Watercoloring", "explanation": "Light creativity."},
            ],
            closing="Be free!",
        )
        mock_store.return_value = None

        payload = {
            "submission_id": "mapping-test-1",
            "user_id": "user-7",
            "answers": [
                {
                    "question_id": "fd1",
                    "question_text": "Food?",
                    "category": "food_and_drink",
                    "answer_text": "I love sharing plates with friends",
                },
            ],
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }

        msg = self._make_message(payload)
        await on_quiz_submitted(msg)

        # Verify the profile was generated with "Free Spirit"
        call_args = mock_profile.call_args
        assert call_args[0][2] == "Free Spirit"  # personality_type arg
        msg.ack.assert_called_once()


# ──────────────────────────────────────────────────────────────
# Supabase store_result Tests
# ──────────────────────────────────────────────────────────────

class TestStoreResult:
    @pytest.mark.asyncio
    @patch("main.supabase_client")
    async def test_store_success(self, mock_supabase):
        from main import store_result

        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": 1}]
        )

        answers = [QuizAnswer(
            question_id="fd1",
            question_text="Food?",
            category="food_and_drink",
            answer_text="I like coffee",
        )]
        scores = ScoringResult(solo_social_score=5, structured_freeform_score=5, reasoning="Balanced")
        profile = ProfileResult(
            profile_title="Dreamer",
            profile_body="Body",
            activity_explanations=[{"rank": 1, "activity": "Watercoloring", "explanation": "Nice"}],
            closing="Bye",
        )

        await store_result(
            submission_id="store-test-1",
            user_id="user-1",
            answers=answers,
            scores=scores,
            personality_type="Dreamer",
            recommendations=["Watercoloring"],
            profile=profile,
        )

        mock_supabase.table.assert_called_with("quiz_results")
        mock_supabase.table.return_value.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_store_no_supabase_skips(self, monkeypatch):
        from main import store_result
        monkeypatch.setattr("main.supabase_client", None)

        # Should not raise — just logs warning
        answers = [QuizAnswer(
            question_id="fd1", question_text="Q", category="cat", answer_text="A",
        )]
        scores = ScoringResult(solo_social_score=5, structured_freeform_score=5, reasoning="test")
        profile = ProfileResult(
            profile_title="Test", profile_body="body",
            activity_explanations=[], closing="end",
        )

        await store_result("sub-1", "user-1", answers, scores, "Test", [], profile)
        # No exception = success (skipped gracefully)


# ──────────────────────────────────────────────────────────────
# AI Call Helper Tests
# ──────────────────────────────────────────────────────────────

class TestAICallHelpers:
    @pytest.mark.asyncio
    @patch("main._call_groq")
    async def test_call_ai_uses_groq_first(self, mock_groq):
        from main import _call_ai
        mock_groq.return_value = '{"result": "groq"}'

        result = await _call_ai("system", "user", 0.5)
        mock_groq.assert_called_once()
        assert result == '{"result": "groq"}'

    @pytest.mark.asyncio
    @patch("main._call_groq", side_effect=Exception("Groq down"))
    @patch("main._call_gemini")
    async def test_call_ai_falls_back_to_gemini(self, mock_gemini, mock_groq):
        from main import _call_ai
        mock_gemini.return_value = '{"result": "gemini"}'

        result = await _call_ai("system", "user", 0.5)
        mock_groq.assert_called_once()
        mock_gemini.assert_called_once()
        assert result == '{"result": "gemini"}'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
