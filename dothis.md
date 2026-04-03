**Question Bank**
- Python file (`question_bank.py`) living inside the quiz microservice
- 4 sections × 10 open-ended questions each
- Sections: Food & Drink, Activity Preferences, Ambience & Vibe, Visit Style & Occasion

---

**Quiz Microservice** Owns everything quiz-related:
- Holds the question bank
- Randomly selects 2 questions per section (8 total) when a session starts
- Serves selected questions to the chatbot UI
- Collects and collates user answers as they come in
- Accepts answer updates when user edits a previous response
- Once all 8 answers finalised, packages full Q&A payload
- Publishes to RabbitMQ for AI microservice to consume

---

**Chatbot UI**
- Requests questions from quiz microservice
- Presents them conversationally, one section at a time (2 questions per section)
- User types free-text responses
- Each answer displays an edit button (✏️) after submission
- User can edit any previous answer at any time before final submission
- On edit, sends updated answer to quiz microservice to overwrite
- No AI involved here
- Final submit button appears after all 8 answers are given
- On submit, triggers quiz microservice to publish to RabbitMQ

---

**AI Microservice** Consumes from RabbitMQ, then makes 2 sequential API calls:

**Call 1 — Scoring (`temperature: 0`)**
- Receives all 8 Q&A pairs
- Blind scoring — rubric uses behavioral descriptors only, no type names
- Scores user on 2 axes: Solo↔Social (0–10), Structured↔Freeform (0–10)
- Returns scores as JSON
- App code maps scores to type — Claude never sees type names:

```
social + structured  → Workshop Goer
social + freeform    → Free Spirit
solo + structured    → Craftsman
solo + freeform      → Dreamer
```

**Call 2 — Profile Write-up (`temperature: 0.7`)**
- Receives all 8 Q&A pairs + scores from Call 1 + resolved personality type + hardcoded recommendations
- Generates personalised personality profile with explanation
- Explains all 3 recommended activities in ranked order, grounded in user's actual answers

---

**Activity Recommendations (hardcoded in app)** Rankings are fixed per type, looked up by app code after Call 1 resolves the type:

| Type          | 1st              | 2nd              | 3rd           |
| ------------- | ---------------- | ---------------- | ------------- |
| Craftsman     | Oil Painting     | Clay Sculpting   | Watercoloring |
| Workshop Goer | Acrylic Painting | Art Jamming      | Oil Painting  |
| Dreamer       | Watercoloring    | Clay Sculpting   | Oil Painting  |
| Free Spirit   | Art Jamming      | Acrylic Painting | Watercoloring |

---

**Storage (Supabase)** AI microservice stores after Call 2:
- User ID
- 8 Q&A pairs
- Axis scores
- Personality type
- Profile write-up
- Ranked activity recommendations

---

**Activities Available** Acrylic Painting, Art Jamming, Clay Sculpting, Oil Painting, Watercoloring
