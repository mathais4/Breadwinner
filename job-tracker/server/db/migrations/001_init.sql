-- Initial schema. Idempotent, so databases created by the old schema.sql can adopt it safely.
DO $$ BEGIN
  CREATE TYPE app_status AS ENUM ('wishlist', 'applied', 'interview', 'offer', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company        TEXT NOT NULL,
  role           TEXT NOT NULL,
  status         app_status NOT NULL DEFAULT 'applied',
  interview_date TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_user_interview ON applications (user_id, interview_date);
