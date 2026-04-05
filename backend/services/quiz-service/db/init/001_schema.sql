CREATE TABLE IF NOT EXISTS quiz_sessions (
  session_id text PRIMARY KEY,
  user_id text NOT NULL,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL,
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id
  ON quiz_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status
  ON quiz_sessions (status);

CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGSERIAL PRIMARY KEY,
  submission_id text NOT NULL UNIQUE,
  user_id text NOT NULL,
  answers jsonb NOT NULL,
  solo_social_score integer NOT NULL,
  structured_freeform_score integer NOT NULL,
  scoring_reasoning text,
  personality_type text NOT NULL,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  food_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  food_recommendation_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  drink_recommendation text NOT NULL DEFAULT '',
  drink_recommendation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_title text,
  profile_body text,
  activity_explanations jsonb NOT NULL DEFAULT '[]'::jsonb,
  closing text,
  confidence_score double precision,
  submitted_at text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id
  ON quiz_results (user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_submission_id
  ON quiz_results (submission_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_personality_type
  ON quiz_results (personality_type);

CREATE INDEX IF NOT EXISTS idx_quiz_results_submitted_at
  ON quiz_results (submitted_at);

CREATE TABLE IF NOT EXISTS quiz_submissions (
  submission_id text PRIMARY KEY,
  user_id text NOT NULL,
  answers jsonb NOT NULL,
  submitted_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_submitted_at
  ON quiz_submissions (user_id, submitted_at DESC);
