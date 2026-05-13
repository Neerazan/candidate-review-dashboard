# Candidate Review Dashboard

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

## Seeded Candidate Data

- 60 candidates are seeded automatically.
- Candidate emails follow: `candidate001@example.com` ... `candidate060@example.com`
