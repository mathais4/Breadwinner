-- More detail per application, plus a status history that powers the funnel and timeline.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS job_url        TEXT,
  ADD COLUMN IF NOT EXISTS location       TEXT,
  ADD COLUMN IF NOT EXISTS source         TEXT,
  ADD COLUMN IF NOT EXISTS salary         TEXT,
  ADD COLUMN IF NOT EXISTS contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS applied_date   DATE,
  ADD COLUMN IF NOT EXISTS deadline_date  DATE,   -- graduate programme closing date
  ADD COLUMN IF NOT EXISTS follow_up_date DATE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS weekly_goal  INT NOT NULL DEFAULT 5 CHECK (weekly_goal BETWEEN 1 AND 100);

-- Existing rows: treat the creation day as the day they applied (unless still a wishlist item).
UPDATE applications SET applied_date = created_at::date
WHERE status <> 'wishlist' AND applied_date IS NULL;

CREATE TABLE IF NOT EXISTS application_events (
  id             SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('created', 'status_change')),
  from_status    app_status,
  to_status      app_status NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_application ON application_events (application_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user ON application_events (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_follow_up ON applications (user_id, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_applications_user_deadline ON applications (user_id, deadline_date);

-- Seed one "created" event per existing application (earlier history wasn't recorded).
-- Guarded so re-running never duplicates events.
INSERT INTO application_events (application_id, user_id, type, to_status, created_at)
SELECT a.id, a.user_id, 'created', a.status, a.created_at
FROM applications a
WHERE NOT EXISTS (SELECT 1 FROM application_events e WHERE e.application_id = a.id);
