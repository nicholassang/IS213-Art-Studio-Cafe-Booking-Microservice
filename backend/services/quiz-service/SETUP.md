# Quiz Session Persistence - Setup Guide

## Overview
Quiz answers are now persisted to Supabase, so refreshing the page won't reset your progress.

## What Changed

### Backend (quiz-service)
- ✅ Added Supabase client integration
- ✅ Sessions are saved to `quiz_sessions` table when created
- ✅ Answers are updated in real-time as you submit them
- ✅ Session restoration from database on page load
- ✅ Sessions marked as "completed" after final submission

### Frontend (ChatWidget)
- ✅ Session ID stored in `sessionStorage`
- ✅ On page open, attempts to restore existing session from backend
- ✅ Rebuilds UI from saved answers if session exists
- ✅ Session cleared only when quiz is retaken

## Setup Required

### 1. Create the Database Table

You **must** run this SQL in your Supabase dashboard:

1. Go to: https://zfufzcfbhmdpratqpsgi.supabase.co
2. Navigate to **SQL Editor**
3. Run the SQL from: `services/quiz-service/create_quiz_sessions_table.sql`

```sql
CREATE TABLE IF NOT EXISTS quiz_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    questions JSONB NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
```

### 2. Restart the Quiz Service

The quiz-service needs to be rebuilt to include the new dependencies:

```bash
cd /Users/rw/group_projects/IS213-Art-Studio-Cafe-Booking-Microservice/backend
docker-compose up -d --build quiz-service
```

### 3. Verify Setup

Check the quiz-service logs to confirm Supabase is connected:

```bash
docker logs quiz-service
```

You should see: `Supabase client initialized successfully`

## How It Works

### Flow Diagram

```
User opens quiz popup
    ↓
Frontend checks sessionStorage for session_id
    ↓
If exists → GET /quiz/session/{session_id} from backend
    ↓
Backend checks memory → if not found, fetches from Supabase
    ↓
Returns session with all saved answers
    ↓
Frontend rebuilds UI with saved progress
```

### Answer Submission

```
User types answer → Send to backend
    ↓
Backend saves to memory (fast access)
    ↓
Backend persists to Supabase (durability)
    ↓
Returns success
```

### Session Lifecycle

1. **Created**: When user opens quiz popup → `status: "active"`
2. **Updated**: Each answer saved in real-time
3. **Completed**: After final submit → `status: "completed"`
4. **Cleaned**: Removed from memory, but stays in Supabase

## Files Modified

- `backend/services/quiz-service/main.py` - Added Supabase integration
- `backend/services/quiz-service/requirements.txt` - Added supabase & dotenv packages
- `backend/services/quiz-service/create_quiz_sessions_table.sql` - Database schema
- `backend/docker-compose.yaml` - Added env_file to quiz-service
- `frontend/app/src/components/ChatWidget.jsx` - Session restoration logic

## Testing

1. Open the quiz and answer a few questions
2. Refresh the page
3. Open the quiz again - you should see "Welcome back!" with your previous answers
4. Continue where you left off

## Troubleshooting

### "Supabase credentials not configured"
- Check that `backend/wrappers/ai-recommendation-wrapper/.env` has `SUPABASE_URL` and `SUPABASE_KEY`
- Restart quiz-service after verifying

### "Session not found"
- Session may have been deleted or expired
- Start a new quiz session

### Answers not persisting
- Check Supabase table exists: `quiz_sessions`
- Check quiz-service logs: `docker logs quiz-service`
- Verify network connectivity to Supabase

## Schema Details

The `quiz_sessions` table stores:
- `session_id`: UUID4, primary key
- `user_id`: Guest or authenticated user ID
- `questions`: JSON array of 8 selected questions
- `answers`: JSON object mapping question_id → answer_text
- `status`: "active" or "completed"
- `created_at`: ISO timestamp
- `updated_at`: Optional, for future use
