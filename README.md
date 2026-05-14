# Candidate Review Dashboard

## Setup Guide

### Prerequisites

- Docker + Docker Compose (recommended)
- Or local tools:
  - Python 3.12
  - `uv`
  - Node.js 20+
  - Yarn

### Option 1: Run with Docker Compose (Recommended)

From the repository root:

```bash
docker compose up --build
```

After startup:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

Stop services:

```bash
docker compose down
```

### Option 2: Run Locally (Without Docker)

1) Start backend:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2) In a new terminal, start frontend:

```bash
cd frontend
yarn install
yarn dev --host 0.0.0.0 --port 5173
```

### Environment Notes

- Backend default DB: `sqlite:///./data/app.db`
- If `data/app.db` does not exist, it is created on startup.
- Seed users and candidates are auto-created during startup.

## Seed Behavior

- The backend auto-seeds data during app startup via FastAPI lifespan.
- Seeding is idempotent: running it multiple times will not duplicate seeded users/candidates.
- Seed script path: `backend/app/seed.py`
- Manual run command:

```bash
cd backend
uv run python -m app.seed
```

## Seeded Credentials

- Admin: `admin@techkraft.local` / `password123`
- Reviewer: `reviewer@techkraft.local` / `password123`
- Reviewer: `reviewer2@techkraft.local` / `password123`

## Seeded Candidate Data

- 60 candidates are seeded automatically.
- Candidate emails follow: `candidate001@example.com` ... `candidate060@example.com`

## Architecture Decision Record (ADR)

### ADR 1 - Seed data on startup for stable demo

- Context: This is take-home project and reviewer need app running quick with data already there.
- Decision: I seed default users and 60 candidates when backend starts. I choose this because this app is internal review dashboard, so showing workflow fast is more important than building full candidate intake system now. With seed, any person can clone, run, login, and test RBAC + scoring flow in few minutes.
- Trade-off: It makes demo very easy and same for everyone, but this is not real production flow. There is no external source like ATS/import yet.

### ADR 2 - SQLAlchemy ORM instead of raw SQL everywhere

- Context: App has many relations and flows (users, scores, tokens, candidates), also RBAC logic and filters.
- Decision: I used SQLAlchemy ORM as main DB layer. I choose this architecture because app has many connected entities and role-based query rules, so ORM relationships make code cleaner and easier to change. Also this project starts with SQLite, and ORM gives easier path to move later to Postgres without rewriting all query logic.
- Trade-off: Code is easier to maintain and safer for query params, and later move to Postgres is easier. But ORM can hide some query details and tuning can be harder than hand-written SQL in some cases.

### ADR 3 - JWT auth with refresh token stored in DB (hashed)

- Context: Need login flow with short access token and refresh support, and token should be revokable.
- Decision: I use JWT for access token, and refresh token is saved in DB as hash (not plain token). I choose this so API stays stateless for normal requests, but refresh sessions are still controllable from backend side (rotate, revoke on logout, block inactive user). Hashing token in DB is safer if DB data leaks.
- Trade-off: This is more secure than storing plain token and easy to revoke per session. But DB lookup on every refresh can be slower than Redis cache. Also for now there is no email verification flow, so account trust model is basic.

## Debugging Bug Identification

The bug is this query loads all rows first:

```python
all_candidates = db.execute("SELECT * FROM candidates").fetchall()
```

Then filtering is done in Python, not in SQL. This looks simple, but at scale this is a big performance issue.
If company has very large data (like 1 million candidates), app will pull huge data into RAM first, then start filtering.
That means more memory usage, slower response, and possible crash/timeouts under load.

Why this matters:

- Database indexes are not used properly for filtering.
- Pagination happens after loading too much data.
- Network + DB + API all do extra work for no reason.

Correct approach is: do filtering and pagination in SQL query level.
Apply `WHERE` for status/keyword and apply `LIMIT` + `OFFSET` in database call itself, so only needed rows come back.

Example:

```sql
SELECT *
FROM candidates
WHERE status = :status
  AND name LIKE :keyword
LIMIT :limit
OFFSET :offset;
```

This way app stays fast and memory-safe even when data size grows.

## Learning Reflection

In this project I implemented SSE only for score updates, and this was a good first step for realtime behavior in this dashboard.
I kept it limited because I wanted core RBAC and scoring flow to stay stable first.
If I get more time, I will extend realtime for candidate status and internal-notes updates with cleaner event channels.

## Current Limitations

- Candidate data source is only seed data on startup; no ATS sync/import flow yet.
- SSE realtime is only for score updates; candidate status and internal notes are not realtime yet.
- Auth trust flow is basic now; email verification and forgot-password flow are not implemented.
- Refresh token lookup is DB-based only; Redis/session cache is not used yet for faster refresh checks.
- SQLite is used for simple setup; good for this take-home, but not best choice for high-concurrency production traffic.

## Example API Calls (curl)

Base URL:

```bash
http://localhost:8000
```

1) Login (stores cookies in `cookies.txt`):

```bash
curl -i -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@techkraft.local","password":"password123"}'
```

2) Get current user:

```bash
curl -i "http://localhost:8000/auth/me" \
  -b cookies.txt
```

3) Refresh access token:

```bash
curl -i -X POST "http://localhost:8000/auth/refresh" \
  -b cookies.txt \
  -c cookies.txt
```

4) List candidates with filter + pagination:

```bash
curl -i "http://localhost:8000/candidates?status=new&page=1&page_size=5" \
  -b cookies.txt
```

5) Get candidate details:

```bash
curl -i "http://localhost:8000/candidates/<candidate_id>" \
  -b cookies.txt
```

6) Add score as reviewer:

```bash
curl -i -X POST "http://localhost:8000/candidates/<candidate_id>/scores" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"category":"Technical Skills","score":4,"note":"Strong API design"}'
```

7) Generate mock AI summary:

```bash
curl -i -X POST "http://localhost:8000/candidates/<candidate_id>/summary" \
  -b cookies.txt
```

8) Logout:

```bash
curl -i -X POST "http://localhost:8000/auth/logout" \
  -b cookies.txt
```
