# question_bank.py
#
# Single source of truth for all quiz questions, options, and categories.
# Imported by quiz_service.py — do not instantiate FastAPI or any service
# logic here.
#
# 4 categories × 10 questions = 40 questions total.
#
# Structure per question:
#   question_id : str   — unique slug (category prefix + number)
#   text        : str   — question shown to the user
#   category    : str   — one of the CATEGORIES keys
#   options     : list  — each option has option_id and text

CATEGORIES: dict[str, str] = {
    "food_and_drink":           "Food & Drink Preferences",
    "activity_preferences":     "Activity Preferences",
    "ambience_and_vibe":        "Ambience & Vibe",
    "visit_style_and_occasion": "Visit Style & Occasion",
}

QUESTION_BANK: list[dict] = [

    # ------------------------------------------------------------------
    # CATEGORY 1 — Food & Drink Preferences (fd1–fd10)
    # ------------------------------------------------------------------
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
    {
        "question_id": "fd6",
        "text": "How do you feel about sharing food or drinks at a café?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd6a", "text": "Love it — sharing makes the experience more fun"},
            {"option_id": "fd6b", "text": "Happy to share a dessert or snack, but not a main"},
            {"option_id": "fd6c", "text": "I prefer to order my own and eat at my own pace"},
            {"option_id": "fd6d", "text": "Depends on who I'm with"},
        ],
    },
    {
        "question_id": "fd7",
        "text": "Which flavour profile do you gravitate towards most?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd7a", "text": "Rich and indulgent (chocolate, cream, caramel)"},
            {"option_id": "fd7b", "text": "Light and fresh (citrus, herbs, floral)"},
            {"option_id": "fd7c", "text": "Savoury and umami (cheese, mushroom, truffle)"},
            {"option_id": "fd7d", "text": "Spiced and bold (chilli, ginger, cinnamon)"},
        ],
    },
    {
        "question_id": "fd8",
        "text": "How important is it that a café sources its ingredients locally or sustainably?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd8a", "text": "Very — I actively seek out sustainable cafés"},
            {"option_id": "fd8b", "text": "Somewhat — it's a nice bonus when they do"},
            {"option_id": "fd8c", "text": "Not particularly — taste comes first for me"},
            {"option_id": "fd8d", "text": "I haven't thought much about it"},
        ],
    },
    {
        "question_id": "fd9",
        "text": "Which of these best describes your ideal café meal occasion?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd9a", "text": "A leisurely brunch with something to linger over"},
            {"option_id": "fd9b", "text": "A quick but satisfying bite between activities"},
            {"option_id": "fd9c", "text": "An indulgent treat — something I wouldn't make at home"},
            {"option_id": "fd9d", "text": "A light snack to accompany a good drink"},
        ],
    },
    {
        "question_id": "fd10",
        "text": "How adventurous are you when it comes to trying unfamiliar ingredients or cuisines at a café?",
        "category": "food_and_drink",
        "options": [
            {"option_id": "fd10a", "text": "Very adventurous — the stranger, the better"},
            {"option_id": "fd10b", "text": "Moderately — I'll try new things if they sound appealing"},
            {"option_id": "fd10c", "text": "Cautious — I like knowing what I'm getting"},
            {"option_id": "fd10d", "text": "Not at all — I stick to what I know I like"},
        ],
    },

    # ------------------------------------------------------------------
    # CATEGORY 2 — Activity Preferences (ap1–ap10)
    # ------------------------------------------------------------------
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
    {
        "question_id": "ap6",
        "text": "How important is it that an activity results in something you can take home?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap6a", "text": "Very important — I love having a tangible keepsake"},
            {"option_id": "ap6b", "text": "Nice but not necessary"},
            {"option_id": "ap6c", "text": "The experience itself is what matters, not a product"},
            {"option_id": "ap6d", "text": "I'd rather not carry anything home"},
        ],
    },
    {
        "question_id": "ap7",
        "text": "How do you feel about receiving instruction or guidance during an activity?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap7a", "text": "Love it — I want step-by-step guidance throughout"},
            {"option_id": "ap7b", "text": "Happy with a brief intro, then freedom to explore"},
            {"option_id": "ap7c", "text": "Prefer minimal instruction — just give me the materials"},
            {"option_id": "ap7d", "text": "I'd rather watch a demonstration first, then try myself"},
        ],
    },
    {
        "question_id": "ap8",
        "text": "Which of these activity outcomes appeals to you most?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap8a", "text": "Learning a new skill I can practise again"},
            {"option_id": "ap8b", "text": "Creating something unique and personal"},
            {"option_id": "ap8c", "text": "Relaxing and switching off from daily stress"},
            {"option_id": "ap8d", "text": "Bonding and laughing with the people I'm with"},
        ],
    },
    {
        "question_id": "ap9",
        "text": "How do you typically feel after a creative or hands-on activity?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap9a", "text": "Energised and inspired to do more"},
            {"option_id": "ap9b", "text": "Calm and satisfied"},
            {"option_id": "ap9c", "text": "Proud if it turned out well, frustrated if not"},
            {"option_id": "ap9d", "text": "It varies — depends on the activity"},
        ],
    },
    {
        "question_id": "ap10",
        "text": "Would you be comfortable participating in an activity in front of other café guests?",
        "category": "activity_preferences",
        "options": [
            {"option_id": "ap10a", "text": "Yes — I enjoy a bit of an audience"},
            {"option_id": "ap10b", "text": "Fine with it as long as it's not a performance"},
            {"option_id": "ap10c", "text": "Prefer a semi-private or sectioned-off space"},
            {"option_id": "ap10d", "text": "No — I'd want a fully private or enclosed setting"},
        ],
    },

    # ------------------------------------------------------------------
    # CATEGORY 3 — Ambience & Vibe (av1–av10)
    # ------------------------------------------------------------------
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
    {
        "question_id": "av6",
        "text": "How does lighting affect your café experience?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av6a", "text": "Warm, dim lighting makes me feel at ease"},
            {"option_id": "av6b", "text": "Bright, natural light keeps me alert and productive"},
            {"option_id": "av6c", "text": "Moody or dramatic lighting adds to the atmosphere"},
            {"option_id": "av6d", "text": "I don't notice lighting much"},
        ],
    },
    {
        "question_id": "av7",
        "text": "How important is it that a café feels Instagram-worthy or photogenic?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av7a", "text": "Very — I love sharing beautiful spaces online"},
            {"option_id": "av7b", "text": "Somewhat — a good backdrop is a bonus"},
            {"option_id": "av7c", "text": "Not important — I'm there for the experience, not content"},
            {"option_id": "av7d", "text": "I actively prefer understated, non-trendy places"},
        ],
    },
    {
        "question_id": "av8",
        "text": "How do you feel about background noise and conversation in a café?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av8a", "text": "I love a gentle hum — it helps me focus"},
            {"option_id": "av8b", "text": "Some noise is fine but loud conversations bother me"},
            {"option_id": "av8c", "text": "The livelier, the better — I feed off the energy"},
            {"option_id": "av8d", "text": "I strongly prefer a quiet environment"},
        ],
    },
    {
        "question_id": "av9",
        "text": "Which of these sensory details matters most to you in a café?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av9a", "text": "The smell — freshly brewed coffee or baked goods"},
            {"option_id": "av9b", "text": "The sound — music, ambience, or pleasant chatter"},
            {"option_id": "av9c", "text": "The look — décor, colour palette, and layout"},
            {"option_id": "av9d", "text": "The feel — comfortable seats, good temperature"},
        ],
    },
    {
        "question_id": "av10",
        "text": "How do you feel about cafés that have a strong theme or concept (e.g. cat café, library café, garden café)?",
        "category": "ambience_and_vibe",
        "options": [
            {"option_id": "av10a", "text": "Love them — the concept makes the visit more memorable"},
            {"option_id": "av10b", "text": "Enjoy them occasionally as a novelty"},
            {"option_id": "av10c", "text": "Prefer a classic café without a gimmick"},
            {"option_id": "av10d", "text": "Depends entirely on the specific theme"},
        ],
    },

    # ------------------------------------------------------------------
    # CATEGORY 4 — Visit Style & Occasion (vs1–vs10)
    # ------------------------------------------------------------------
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
    {
        "question_id": "vs6",
        "text": "How far in advance do you typically plan a café visit?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs6a", "text": "Spontaneous — I decide on the day"},
            {"option_id": "vs6b", "text": "A day or two ahead"},
            {"option_id": "vs6c", "text": "About a week in advance"},
            {"option_id": "vs6d", "text": "Weeks ahead, especially if booking an activity"},
        ],
    },
    {
        "question_id": "vs7",
        "text": "How long do you usually spend at a café per visit?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs7a", "text": "Under 30 minutes — grab and go"},
            {"option_id": "vs7b", "text": "30–60 minutes"},
            {"option_id": "vs7c", "text": "1–2 hours"},
            {"option_id": "vs7d", "text": "Half a day or more — I settle in"},
        ],
    },
    {
        "question_id": "vs8",
        "text": "How do you usually discover new cafés to visit?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs8a", "text": "Social media (Instagram, TikTok, etc.)"},
            {"option_id": "vs8b", "text": "Recommendations from friends or family"},
            {"option_id": "vs8c", "text": "Review platforms (Google, Yelp, Burpple)"},
            {"option_id": "vs8d", "text": "Walking past and noticing it myself"},
        ],
    },
    {
        "question_id": "vs9",
        "text": "How likely are you to return to a café you've already visited?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs9a", "text": "Very likely — I'm loyal when I find somewhere good"},
            {"option_id": "vs9b", "text": "Likely if the experience was great"},
            {"option_id": "vs9c", "text": "I prefer exploring new places each time"},
            {"option_id": "vs9d", "text": "Only if there's something new to try there"},
        ],
    },
    {
        "question_id": "vs10",
        "text": "What would most likely make you leave a café earlier than planned?",
        "category": "visit_style_and_occasion",
        "options": [
            {"option_id": "vs10a", "text": "It's too noisy or crowded"},
            {"option_id": "vs10b", "text": "The service is slow or unfriendly"},
            {"option_id": "vs10c", "text": "The food or drinks didn't meet expectations"},
            {"option_id": "vs10d", "text": "I rarely leave early — I'm patient"},
        ],
    },
]