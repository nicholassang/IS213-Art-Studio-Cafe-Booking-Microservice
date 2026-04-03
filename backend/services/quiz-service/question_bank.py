# question_bank.py
#
# Single source of truth for all quiz questions (open-ended).
# Imported by quiz_service.py — do not instantiate FastAPI or any service
# logic here.
#
# 4 categories × 10 questions = 40 questions total.
# Quiz service randomly selects 2 per category (8 total) per session.
#
# Structure per question:
#   question_id : str  — unique slug (category prefix + number)
#   text        : str  — conversational question shown to the user
#   category    : str  — one of the CATEGORIES keys

QUESTION_BANK: list[dict] = [

    # ------------------------------------------------------------------
    # CATEGORY 1 — Food & Drink Preferences (fd1–fd10)
    # ------------------------------------------------------------------
    {
        "question_id": "fd1",
        "text": "What's your ideal order at a café — walk me through what you'd get?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd2",
        "text": "Are you the type to try something new on the menu, or do you stick to what you know?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd3",
        "text": "How important is it to you that a café caters to dietary preferences like vegan or gluten-free options?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd4",
        "text": "Do you usually visit a café just for a drink, or do you like to make a meal of it?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd5",
        "text": "Would you say you're someone who eats to fuel up, or someone who treats café food as part of the experience?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd6",
        "text": "Do you enjoy sharing food and drinks with others at a café, or do you prefer ordering just for yourself?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd7",
        "text": "What kind of flavours or cuisines do you find yourself gravitating towards at a café?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd8",
        "text": "Does it matter to you whether a café uses locally sourced or sustainable ingredients?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd9",
        "text": "Describe your ideal café meal occasion — are you there for a quick bite or a long, leisurely sit-down?",
        "category": "food_and_drink",
    },
    {
        "question_id": "fd10",
        "text": "How do you feel about trying completely unfamiliar ingredients or dishes you've never heard of?",
        "category": "food_and_drink",
    },

    # ------------------------------------------------------------------
    # CATEGORY 2 — Activity Preferences (ap1–ap10)
    # ------------------------------------------------------------------
    {
        "question_id": "ap1",
        "text": "If a café offered a creative activity, what would you hope it looks like?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap2",
        "text": "Do you prefer being guided step-by-step through an activity, or would you rather just dive in and figure it out yourself?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap3",
        "text": "How long are you comfortable spending on a hands-on activity before it starts to feel like too much?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap4",
        "text": "Would you rather do a creative activity on your own, or does it feel better when others are involved?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap5",
        "text": "What would make a café activity feel worthwhile to you — learning something new, making something, relaxing, or just having fun with others?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap6",
        "text": "Would it matter to you if an activity resulted in something you could take home, or is the experience itself enough?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap7",
        "text": "How do you feel about a facilitator or instructor guiding you during a creative session?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap8",
        "text": "After finishing a creative activity, what feeling would make you consider it a success?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap9",
        "text": "Are you comfortable doing a creative activity in front of other café guests, or do you prefer a more private setting?",
        "category": "activity_preferences",
    },
    {
        "question_id": "ap10",
        "text": "Would you prefer an activity that challenges you or one that feels easy and pressure-free?",
        "category": "activity_preferences",
    },

    # ------------------------------------------------------------------
    # CATEGORY 3 — Ambience & Vibe (av1–av10)
    # ------------------------------------------------------------------
    {
        "question_id": "av1",
        "text": "Describe your perfect café atmosphere — what does it look, sound, and feel like?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av2",
        "text": "Does the way a café looks affect whether you'd go back?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av3",
        "text": "What kind of music or background sound do you like in a café?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av4",
        "text": "Do you prefer indoor or outdoor seating, and does it change depending on the occasion?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av5",
        "text": "How does lighting affect your mood or comfort in a café?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av6",
        "text": "Does it matter to you whether a café is Instagram-worthy or photogenic?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av7",
        "text": "How do you feel about background noise and chatter in a café — does it help or bother you?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av8",
        "text": "Which sensory detail matters most to you in a café — the smell, the sound, the look, or the feel?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av9",
        "text": "How do you feel about cafés built around a strong concept or theme, like a cat café or a library café?",
        "category": "ambience_and_vibe",
    },
    {
        "question_id": "av10",
        "text": "If you walked into a café and immediately felt uncomfortable, what would most likely be the reason?",
        "category": "ambience_and_vibe",
    },

    # ------------------------------------------------------------------
    # CATEGORY 4 — Visit Style & Occasion (vs1–vs10)
    # ------------------------------------------------------------------
    {
        "question_id": "vs1",
        "text": "Who do you usually visit cafés with, and what are you typically there for?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs2",
        "text": "Are you someone who plans café visits ahead of time, or do you just show up spontaneously?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs3",
        "text": "How often do you visit cafés, and what usually prompts you to go?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs4",
        "text": "What time of day do you most enjoy visiting a café, and why?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs5",
        "text": "What kind of occasion would most likely bring you to a café that offers a bookable activity?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs6",
        "text": "How long do you usually spend at a café — do you settle in or keep it short?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs7",
        "text": "How do you usually discover new cafés — social media, word of mouth, reviews, or just stumbling across them?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs8",
        "text": "Are you loyal to cafés you love, or do you prefer exploring somewhere new each time?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs9",
        "text": "What would make you leave a café earlier than you planned?",
        "category": "visit_style_and_occasion",
    },
    {
        "question_id": "vs10",
        "text": "If you were bringing someone to a café for the first time, what would you want them to experience?",
        "category": "visit_style_and_occasion",
    },
]
