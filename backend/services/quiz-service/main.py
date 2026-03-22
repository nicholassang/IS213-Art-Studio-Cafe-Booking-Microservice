import os
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import aio_pika
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client

load_dotenv()

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_KEY: str = os.environ["SUPABASE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# RabbitMQ
# ---------------------------------------------------------------------------
RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
QUIZ_EXCHANGE: str = os.getenv("QUIZ_EXCHANGE", "quiz_events")

_quiz_exchange: Optional[aio_pika.abc.AbstractExchange] = None
_rabbitmq_connection = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rabbitmq_connection, _quiz_exchange
    try:
        _rabbitmq_connection = await aio_pika.connect_robust(RABBITMQ_URL)
        channel = await _rabbitmq_connection.channel()
        _quiz_exchange = await channel.declare_exchange(
            QUIZ_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
        )
        print("Connected to RabbitMQ.")
    except Exception as exc:
        print(f"RabbitMQ unavailable – async events disabled. ({exc})")

    yield

    if _rabbitmq_connection and not _rabbitmq_connection.is_closed:
        await _rabbitmq_connection.close()


# ---------------------------------------------------------------------------
# Predefined question bank
# Each question has a category tag used by the Recommendation service
# to infer user preferences.
# ---------------------------------------------------------------------------
QUESTION_BANK: list[dict] = [

    # ------------------------------------------------------------------ #
    #  CATEGORY 1 — Food & Drink Preferences                              #
    # ------------------------------------------------------------------ #
    {
        "question_id": "fd1",
        "text": "Which type of food would you most enjoy at a café?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd1a", "text": "Light bites and pastries"},
            {"option_id": "fd1b", "text": "Full brunch or lunch meals"},
            {"option_id": "fd1c", "text": "Healthy, plant-based options"},
            {"option_id": "fd1d", "text": "Desserts and sweet treats"},
        ],
    },
    {
        "question_id": "fd2",
        "text": "What is your go-to café drink?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd2a", "text": "Specialty coffee (flat white, pour-over, cold brew)"},
            {"option_id": "fd2b", "text": "Tea or matcha"},
            {"option_id": "fd2c", "text": "Fresh juices or smoothies"},
            {"option_id": "fd2d", "text": "Whichever seasonal special catches my eye"},
        ],
    },
    {
        "question_id": "fd3",
        "text": "How important is having dietary-friendly options (vegan, gluten-free, etc.) to you?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd3a", "text": "Very important — it's a dealbreaker for me"},
            {"option_id": "fd3b", "text": "Nice to have, but not essential"},
            {"option_id": "fd3c", "text": "Not important — I eat everything"},
            {"option_id": "fd3d", "text": "I check for a specific requirement only"},
        ],
    },
    {
        "question_id": "fd4",
        "text": "How much do you typically spend on food and drinks per café visit?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd4a", "text": "Under $15 — just a drink is fine"},
            {"option_id": "fd4b", "text": "$15–$30 — a drink and a snack"},
            {"option_id": "fd4c", "text": "$30–$50 — a proper meal and drinks"},
            {"option_id": "fd4d", "text": "Over $50 — I go all out"},
        ],
    },
    {
        "question_id": "fd5",
        "text": "Which best describes your approach to trying food at a new café?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd5a", "text": "I order the chef's recommendation or daily special"},
            {"option_id": "fd5b", "text": "I stick to familiar favourites"},
            {"option_id": "fd5c", "text": "I look for the most unique or unusual item"},
            {"option_id": "fd5d", "text": "I decide based on what others at my table order"},
        ],
    },

    # ------------------------------------------------------------------ #
    #  CATEGORY 2 — Activity Preferences                                  #
    # ------------------------------------------------------------------ #
    {
        "question_id": "ap1",
        "text": "Which type of activity would you most enjoy at a café?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap1a", "text": "Art or craft workshop (painting, pottery, etc.)"},
            {"option_id": "ap1b", "text": "Live music or acoustic performance"},
            {"option_id": "ap1c", "text": "Board games or trivia night"},
            {"option_id": "ap1d", "text": "Just relaxing with no planned activity"},
        ],
    },
    {
        "question_id": "ap2",
        "text": "How hands-on do you like your café activities to be?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap2a", "text": "Very hands-on — I want to make or build something"},
            {"option_id": "ap2b", "text": "Moderately involved — guided but relaxed"},
            {"option_id": "ap2c", "text": "Mostly watching or listening"},
            {"option_id": "ap2d", "text": "No activity — the café itself is the experience"},
        ],
    },
    {
        "question_id": "ap3",
        "text": "How long are you comfortable spending on a café activity?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap3a", "text": "Under 30 minutes — quick and casual"},
            {"option_id": "ap3b", "text": "30–60 minutes"},
            {"option_id": "ap3c", "text": "1–2 hours — I like to immerse myself"},
            {"option_id": "ap3d", "text": "As long as it takes — I have no rush"},
        ],
    },
    {
        "question_id": "ap4",
        "text": "Would you prefer activities that are competitive or collaborative?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap4a", "text": "Competitive — I enjoy a friendly challenge"},
            {"option_id": "ap4b", "text": "Collaborative — working together is more fun"},
            {"option_id": "ap4c", "text": "Solo — I prefer my own pace"},
            {"option_id": "ap4d", "text": "No preference — I'm flexible"},
        ],
    },
    {
        "question_id": "ap5",
        "text": "Which theme appeals to you most for a café activity?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap5a", "text": "Creative arts (drawing, photography, florals)"},
            {"option_id": "ap5b", "text": "Food and drinks (tasting, brewing, baking)"},
            {"option_id": "ap5c", "text": "Wellness (mindfulness, journalling, yoga)"},
            {"option_id": "ap5d", "text": "Social fun (games, karaoke, mixers)"},
        ],
    },

    # ------------------------------------------------------------------ #
    #  CATEGORY 3 — Ambience & Vibe                                       #
    # ------------------------------------------------------------------ #
    {
        "question_id": "av1",
        "text": "What kind of atmosphere do you prefer in a café?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av1a", "text": "Quiet and cosy — ideal for reading or working"},
            {"option_id": "av1b", "text": "Lively and buzzing — full of energy"},
            {"option_id": "av1c", "text": "Artsy and eclectic — visually interesting"},
            {"option_id": "av1d", "text": "Natural and calm — plants, light, open space"},
        ],
    },
    {
        "question_id": "av2",
        "text": "Which interior style appeals to you most?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av2a", "text": "Minimalist and modern"},
            {"option_id": "av2b", "text": "Vintage or retro"},
            {"option_id": "av2c", "text": "Warm and rustic (wood, warm lighting)"},
            {"option_id": "av2d", "text": "Maximalist and bold (lots of colour and art)"},
        ],
    },
    {
        "question_id": "av3",
        "text": "What kind of music do you prefer in the background?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av3a", "text": "Soft lo-fi or jazz — barely noticeable"},
            {"option_id": "av3b", "text": "Upbeat indie or pop"},
            {"option_id": "av3c", "text": "Live acoustic performances"},
            {"option_id": "av3d", "text": "Silence or near-silence"},
        ],
    },
    {
        "question_id": "av4",
        "text": "How important is the visual aesthetic of a café to you?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av4a", "text": "Very — I'd visit just for the aesthetics"},
            {"option_id": "av4b", "text": "Somewhat — it adds to the experience"},
            {"option_id": "av4c", "text": "Not much — I care more about the food and drinks"},
            {"option_id": "av4d", "text": "Not at all — comfort is what matters"},
        ],
    },
    {
        "question_id": "av5",
        "text": "Do you prefer indoor or outdoor seating?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av5a", "text": "Always indoors — I like air conditioning"},
            {"option_id": "av5b", "text": "Outdoors when the weather is nice"},
            {"option_id": "av5c", "text": "Covered alfresco — the best of both"},
            {"option_id": "av5d", "text": "No preference"},
        ],
    },

    # ------------------------------------------------------------------ #
    #  CATEGORY 4 — Visit Style & Occasion                                #
    # ------------------------------------------------------------------ #
    {
        "question_id": "vs1",
        "text": "How do you usually visit a café?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs1a", "text": "Solo — my personal retreat"},
            {"option_id": "vs1b", "text": "With a friend or partner"},
            {"option_id": "vs1c", "text": "With a small group (3–5 people)"},
            {"option_id": "vs1d", "text": "With a large group or for an event"},
        ],
    },
    {
        "question_id": "vs2",
        "text": "What is the most common reason you visit a café?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs2a", "text": "To work or study"},
            {"option_id": "vs2b", "text": "To catch up with someone"},
            {"option_id": "vs2c", "text": "To treat myself or unwind"},
            {"option_id": "vs2d", "text": "To explore somewhere new"},
        ],
    },
    {
        "question_id": "vs3",
        "text": "How often do you visit cafés?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs3a", "text": "Daily — it's part of my routine"},
            {"option_id": "vs3b", "text": "A few times a week"},
            {"option_id": "vs3c", "text": "Once a week or so"},
            {"option_id": "vs3d", "text": "Occasionally — only for special visits"},
        ],
    },
    {
        "question_id": "vs4",
        "text": "When do you most often visit cafés?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs4a", "text": "Morning — to start the day right"},
            {"option_id": "vs4b", "text": "Afternoon — a mid-day break"},
            {"option_id": "vs4c", "text": "Evening — to wind down"},
            {"option_id": "vs4d", "text": "Weekends only"},
        ],
    },
    {
        "question_id": "vs5",
        "text": "Which occasion would most likely bring you to a café with a booked activity?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs5a", "text": "A date or romantic outing"},
            {"option_id": "vs5b", "text": "A birthday or celebration"},
            {"option_id": "vs5c", "text": "A casual hangout with friends"},
            {"option_id": "vs5d", "text": "A team bonding or work event"},
        ],
    },
]

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Quiz Service",
    description="Serves predefined preference questions and stores user answers for the Recommendation service.",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class OptionOut(BaseModel):
    option_id: str
    text: str


class QuestionOut(BaseModel):
    question_id: str
    text: str
    category: str
    options: list[OptionOut]


class AnswerIn(BaseModel):
    question_id: str
    selected_option_id: str


class QuizSubmission(BaseModel):
    user_id: str
    answers: list[AnswerIn]


class QuizSubmissionResponse(BaseModel):
    submission_id: str
    user_id: str
    submitted_at: str
    answer_count: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _publish(routing_key: str, payload: dict) -> None:
    if _quiz_exchange is None:
        return
    try:
        await _quiz_exchange.publish(
            aio_pika.Message(
                body=json.dumps(payload).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=routing_key,
        )
    except Exception as exc:
        print(f"Failed to publish '{routing_key}': {exc}")


def _validate_answers(answers: list[AnswerIn]) -> None:
    """Check every submitted answer maps to a real question and option."""
    question_map = {q["question_id"]: q for q in QUESTION_BANK}
    for answer in answers:
        question = question_map.get(answer.question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown question_id: '{answer.question_id}'.",
            )
        valid_options = {opt["option_id"] for opt in question["options"]}
        if answer.selected_option_id not in valid_options:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid option '{answer.selected_option_id}' for question '{answer.question_id}'.",
            )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "quiz"}


@app.get("/quiz/questions", response_model=list[QuestionOut], tags=["Quiz"])
def get_questions():
    """
    Return the full predefined question bank.
    The frontend renders these questions for the user to answer.
    """
    return QUESTION_BANK


@app.post(
    "/quiz/submit",
    response_model=QuizSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Quiz"],
)
async def submit_answers(payload: QuizSubmission):
    """
    Validate and store a user's answers to the predefined questions.

    - Validates every answer against the question bank.
    - Persists the full submission to Supabase (`quiz_submissions` table).
    - Publishes a `quiz.submitted` event to RabbitMQ so the
      Recommendation service can build a personalised activity list.
    """
    _validate_answers(payload.answers)

    submission_id = str(uuid.uuid4())
    submitted_at = _now_iso()

    record = {
        "submission_id": submission_id,
        "user_id": payload.user_id,
        "answers": [a.model_dump() for a in payload.answers],
        "submitted_at": submitted_at,
    }

    result = supabase.table("quiz_submissions").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save submission.")

    # Publish event → consumed by Recommendation service
    await _publish(
        "quiz.submitted",
        {
            "submission_id": submission_id,
            "user_id": payload.user_id,
            "answers": [a.model_dump() for a in payload.answers],
            "submitted_at": submitted_at,
        },
    )

    return {
        "submission_id": submission_id,
        "user_id": payload.user_id,
        "submitted_at": submitted_at,
        "answer_count": len(payload.answers),
    }


@app.get("/quiz/submissions/{user_id}", tags=["Quiz"])
def get_user_submission(user_id: str):
    """
    Retrieve the most recent quiz submission for a given user.
    Useful for the Recommendation service or frontend to check
    whether the user has already completed the quiz.
    """
    result = (
        supabase.table("quiz_submissions")
        .select("*")
        .eq("user_id", user_id)
        .order("submitted_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No submission found for this user.")
    return result.data[0]