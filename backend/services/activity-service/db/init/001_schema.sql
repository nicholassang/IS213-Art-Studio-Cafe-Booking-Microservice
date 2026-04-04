CREATE TABLE IF NOT EXISTS activities (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  price bigint NOT NULL,
  duration text,
  image text,
  rating double precision,
  reviews bigint,
  level text,
  what_to_expect jsonb,
  session_flow jsonb,
  after_session jsonb
);

CREATE TABLE IF NOT EXISTS bookings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  activity_id text NOT NULL REFERENCES activities(id),
  user_name text NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  user_email text,
  activity_name text,
  start_time timestamptz,
  end_time timestamptz,
  food_orders jsonb,
  total_amount double precision,
  status text DEFAULT 'confirmed',
  payment jsonb,
  additional_notes text
);

CREATE TABLE IF NOT EXISTS saved_activities (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_name text NOT NULL,
  activity_id text NOT NULL REFERENCES activities(id),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_name, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot_lookup
  ON bookings (activity_id, start_time, end_time, status);

CREATE INDEX IF NOT EXISTS idx_saved_activities_user
  ON saved_activities (user_name, created_at DESC);
