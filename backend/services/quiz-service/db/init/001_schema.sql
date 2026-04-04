CREATE TABLE IF NOT EXISTS quiz_submissions (
  submission_id text PRIMARY KEY,
  user_id text NOT NULL,
  answers jsonb NOT NULL,
  submitted_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_submitted_at
  ON quiz_submissions (user_id, submitted_at DESC);
