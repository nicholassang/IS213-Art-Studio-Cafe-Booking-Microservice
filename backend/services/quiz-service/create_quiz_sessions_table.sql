-- Create quiz_sessions table in Supabase
-- Run this in your Supabase SQL Editor at: https://zfufzcfbhmdpratqpsgi.supabase.co

CREATE TABLE IF NOT EXISTS quiz_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    questions JSONB NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);

-- Enable Row Level Security (RLS)
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (service key bypasses RLS)
-- No additional policies needed since we're using service_role key
