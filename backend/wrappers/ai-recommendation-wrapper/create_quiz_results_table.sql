-- Create quiz_results table in Supabase
-- Run this in your Supabase SQL Editor at: https://zfufzcfbhmdpratqpsgi.supabase.co

CREATE TABLE IF NOT EXISTS quiz_results (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submission_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    answers JSONB NOT NULL,
    solo_social_score INT NOT NULL,
    structured_freeform_score INT NOT NULL,
    scoring_reasoning TEXT,
    personality_type TEXT NOT NULL,
    recommendations JSONB NOT NULL DEFAULT '[]',
    food_recommendations JSONB NOT NULL DEFAULT '[]',
    food_recommendation_details JSONB NOT NULL DEFAULT '[]',
    drink_recommendation TEXT NOT NULL DEFAULT '',
    drink_recommendation_details JSONB NOT NULL DEFAULT '{}',
    profile_title TEXT,
    profile_body TEXT,
    activity_explanations JSONB NOT NULL DEFAULT '[]',
    closing TEXT,
    confidence_score FLOAT,
    submitted_at TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_submission_id ON quiz_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_personality_type ON quiz_results(personality_type);
CREATE INDEX IF NOT EXISTS idx_quiz_results_submitted_at ON quiz_results(submitted_at);

-- Enable Row Level Security (RLS)
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (service key bypasses RLS)
-- No additional policies needed since we're using service_role key
