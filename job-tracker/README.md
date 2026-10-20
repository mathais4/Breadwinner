# Launchpad: a graduate job-hunt tracker

Built for the autumn graduate-programme season in Ireland, where closing dates are tight, most replies never come, and the winners are the people who follow up and tailor their CV. It is a full-stack app, not a to-do list: it tells you what needs attention today.

**Stack:** React (Vite) · Node/Express · PostgreSQL (plain SQL via `pg`) · JWT auth (bcrypt) · Zod validation · Vitest + Supertest · Node's built-in test runner for the pure logic.

## What makes it different

| Feature | What it does |
|---|---|
| **Needs attention** | One list of what to do now: graduate programmes closing soon, applications that have gone quiet (14+ days) or have a follow-up date that has arrived, and upcoming interviews. |
| **Closing dates** | Every wishlist role can carry a closing date, shown as a colour-coded countdown ("Closes 31 Oct · in 5 days"). Sort by it. Missed ones are counted so the list stays honest. |
| **Weekly goal, ring and streak** | Set a target (default 5 applications a week). The streak ignores the current week until it ends, so a slow Monday doesn't break it. |
| **Funnel and reply stats** | Applied → interview → offer, the share of applications that got any reply, and your average days to a reply. Built from a recorded status history, so a rejected application that had an interview still counts as one. |
| **CV match scorer** | Paste your CV once and any job description to get a score, the skills you already show and the ones the posting wants that you lack. Deterministic and offline: no AI service, nothing leaves your browser. |
| **Interview story bank** | STAR stories by competency, plus a practice mode that asks a behavioural question and points to the story you would use. |
| **Email drafts** | Follow-up, post-interview thank-you and feedback-request templates filled from the application and signed with your name. |
| **Calendar export** | One `.ics` file with interviews (1-hour reminder), closing dates (1-day reminder) and follow-ups. Works with Google, Outlook and Apple Calendar. |
| **Board** | Kanban with drag and drop, optimistic updates and a keyboard-friendly "Move to" menu on every card. |
| **Command palette** | `Ctrl/Cmd + K` to jump anywhere or open an application by name; `n` to add one. |
| **History** | Every application keeps a timeline of status changes. |
| **CSV export** | Download everything. Cells starting with `= + - @` are neutralised so spreadsheets can't run them as formulas. |

## Run it locally

You need **Node 20+** and **PostgreSQL** (locally, or via the Docker file below).

```bash
# 1. Database
docker compose up -d                  # or: createdb job_tracker

# 2. API (terminal 1)
cd server
npm install
cp .env.example .env                  # adjust DATABASE_URL / JWT_SECRET if needed
npm run migrate                       # applies db/migrations/*.sql
npm run dev                           # http://localhost:4000  (check /api/health)

# 3. Frontend (terminal 2)
cd client
npm install
npm run dev                           # http://localhost:5173
```

Sign up, then add a few applications. Set a closing date on a wishlist role and a follow-up date on an applied one to see the dashboard come alive.

### Upgrading an existing database

Just run `npm run migrate`. Migrations are tracked in a `schema_migrations` table and are idempotent, so a database created by the earlier `schema.sql` is upgraded in place: existing applications keep their data, get an applied date, and are seeded with a "created" history entry.

## Tests

```bash
cd client && npm test          # 32 tests: CV matcher, dates, emails, calendar file, prep. No setup needed.
cd server && npm run test:unit # 26 tests: analytics, validation, query builder, CSV, rate limiter. No database needed.
cd server && npm test          # API integration tests (needs the test database below)
```

Integration tests wipe tables, so they use a **separate** database; the setup refuses to run unless its name contains "test".

```bash
createdb job_tracker_test         # Docker: docker compose exec db createdb -U postgres job_tracker_test
cd server && cp .env.test.example .env.test && npm test
```

GitHub Actions (`.github/workflows/ci.yml`) runs all of this, with a Postgres service, on every push and pull request.

## API

All routes except register, login and health need `Authorization: Bearer <token>`.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{email, password(min 8), display_name?}` → 201 `{token, user}` |
| POST | `/api/auth/login` | → 200 `{token, user}` (rate limited) |
| GET | `/api/auth/me` | current user |
| PATCH | `/api/profile` | `{display_name?, weekly_goal?}` |
| GET | `/api/applications` | `q` (company, role, notes, location, source), `status`, `sort` (`created_at`, `updated_at`, `company`, `applied_date`, `deadline_date`, `follow_up_date`, `interview_date`), `order`, `page`, `limit` (≤ 200) |
| POST | `/api/applications` | company, role, status?, interview_date?, notes?, job_url?, location?, source?, salary?, contact_name?, applied_date?, deadline_date?, follow_up_date? |
| GET/PATCH/DELETE | `/api/applications/:id` | 404 if it isn't yours |
| GET | `/api/applications/:id/events` | status history |
| GET | `/api/applications/export.csv` | all your applications as CSV |
| GET | `/api/dashboard` | totals, goal and streak, weekly counts, funnel, reply stats, follow-ups, deadlines, interviews, recent |

Errors: `400` validation (`{error, details:[{field,message}]}`), `401`, `404`, `409` duplicate email, `429` too many login attempts, `500`.

## Design notes (good interview talking points)

- **Insights are pure functions.** `server/src/lib/insights.js` takes rows and returns the dashboard. It is covered by unit tests with fixed dates, so the streak, funnel and follow-up rules are verified without a database.
- **Status history makes the funnel honest.** An `application_events` table is written in the same transaction as each status change, so "reached interview" survives a later rejection.
- **DATE columns stay strings.** `node-pg` turns `date` into a JS `Date` at local midnight, which shifts the day by time zone. A type parser keeps them as `YYYY-MM-DD`, and all day arithmetic is done in UTC calendar days.
- **Security.** Every query filters by `user_id` (tested). Only `http(s)` job links are accepted, because a stored `javascript:` link would be XSS. Search treats `%` and `_` literally. CSV export defuses formula injection. Login and register are rate limited. Unknown request fields are dropped by Zod.
- **Migrations, not a schema file.** Ordered SQL files, applied once each in a transaction.
- **Stale responses can't win.** List pages abort their previous request when filters change.
- **Accessible by default.** Focus-trapped dialogs that restore focus, only the top dialog reacts to Escape, keyboard alternative to drag and drop, live-region toasts, reduced-motion and dark-mode support.
- **Privacy.** Your CV text and interview stories are stored only in your browser's `localStorage`; they never reach the server.

Known limits: the rate limiter is in-memory (per server instance); "today" on the server is UTC, which can be an hour off around midnight in summer; the CV matcher knows a fixed list of ~90 skills (add more in `client/src/lib/match.js`).

## Deploy

**Render (uses `render.yaml`):**
1. Push this repo to GitHub.
2. Render dashboard → New → Blueprint → select the repo. It creates the Postgres DB, the API and the static frontend.
3. After the first deploy, set `CLIENT_ORIGIN` on the API to your frontend URL and `VITE_API_URL` on the frontend to your API URL. Redeploy both.

The API build step runs `npm run migrate`, so tables and upgrades are applied automatically.
