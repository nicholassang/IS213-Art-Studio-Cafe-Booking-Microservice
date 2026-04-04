CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);
