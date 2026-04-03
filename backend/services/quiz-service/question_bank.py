# question_bank.py for quiz-service

"""
Question Bank for Quiz Microservice
4 sections × 10 open-ended questions each.
All questions are free-text — no multiple choice.
"""

QUESTION_BANK: list[dict] = [
    # ──────────────────────────────────────────────
    # SECTION 1 — Food & Drink (10 questions)
    # ──────────────────────────────────────────────
    {
        "question_id": "fd1",
        "text": "When you walk into a café, what's the first thing you look for on the menu?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd2",
        "text": "Describe your ideal café drink on a lazy afternoon.",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd3",
        "text": "How do you feel about trying new or unusual food combinations at a café?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd4",
        "text": "What does your perfect café meal look like — light snack, full meal, or something in between?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd5",
        "text": "Do you have any dietary preferences or restrictions that shape your café choices?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd6",
        "text": "When dining at a café, do you prefer familiar comfort food or adventurous new flavours?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd7",
        "text": "How much do you typically spend on food and drinks during a café visit?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd8",
        "text": "What role does presentation and aesthetics of food play in your café experience?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd9",
        "text": "Describe a memorable food or drink experience you've had at a café.",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd10",
        "text": "If a café offered a seasonal special, how likely are you to try it and why?",
        "category": "food_and_drink",
    },

    # ──────────────────────────────────────────────
    # SECTION 2 — Activity Preferences (10 questions)
    # ──────────────────────────────────────────────
    {
        "question_id": "ap1",
        "text": "What kind of hands-on activities do you enjoy most — structured workshops or free-form creative sessions?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap2",
        "text": "When doing a creative activity, do you prefer working alone, with a partner, or in a group?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap3",
        "text": "How long are you comfortable spending on a single creative activity?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap4",
        "text": "Describe your ideal level of guidance during a workshop — step-by-step instruction or explore on your own?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap5",
        "text": "What draws you more — the process of making something or the finished result?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap6",
        "text": "Have you ever tried an art or craft activity before? What was it like?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap7",
        "text": "Do you prefer activities that are relaxing and meditative or challenging and skill-building?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap8",
        "text": "If you could take home something you made yourself, what would it be?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap9",
        "text": "How important is it that the activity produces something you can display or gift?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap10",
        "text": "What would make a creative workshop feel worth returning to again and again?",
        "category": "activity_preferences",
    },

    # ──────────────────────────────────────────────
    # SECTION 3 — Ambience & Vibe (10 questions)
    # ──────────────────────────────────────────────
    {
        "question_id": "av1",
        "text": "Describe the atmosphere of your dream café — what does it feel like when you walk in?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av2",
        "text": "What kind of interior design or décor catches your attention and makes you want to stay?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av3",
        "text": "How does background music affect your café experience — what kind and how loud?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av4",
        "text": "Do you prefer a bustling, energetic space or a quiet, intimate retreat?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av5",
        "text": "How important are natural light, plants, and outdoor elements in a café's ambience?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av6",
        "text": "What visual or sensory details make a café feel special to you?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av7",
        "text": "Would you rather sit by a window, in a cosy corner, or out on a terrace?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av8",
        "text": "How does the scent or aroma of a café influence your overall experience?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av9",
        "text": "Describe a café space you've visited that left a lasting impression on you.",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av10",
        "text": "What kind of seating arrangement do you prefer — communal tables, private booths, or scattered chairs?",
        "category": "ambience_and_vibe",
    },

    # ──────────────────────────────────────────────
    # SECTION 4 — Visit Style & Occasion (10 questions)
    # ──────────────────────────────────────────────
    {
        "question_id": "vs1",
        "text": "Do you usually visit cafés solo, with a friend, or as part of a group? What do you enjoy about it?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs2",
        "text": "What's your most common reason for booking a café experience — celebration, relaxation, or exploration?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs3",
        "text": "How often do you seek out new café experiences versus returning to familiar spots?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs4",
        "text": "What time of day do you most enjoy visiting a café, and why?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs5",
        "text": "If you were planning a special outing at a café, what occasion would it be?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs6",
        "text": "Do you prefer planned, structured outings or spontaneous, go-with-the-flow visits?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs7",
        "text": "How important is it that a café experience feels unique or one-of-a-kind?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs8",
        "text": "Would you book a café activity for a team event, a date night, or a personal treat? What appeals to you?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs9",
        "text": "Describe your ideal weekend café outing from start to finish.",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs10",
        "text": "What would make you recommend a café experience to a friend without hesitation?",
        "category": "visit_style_and_occasion",
    },
]
