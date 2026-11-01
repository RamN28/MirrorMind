# MirrorMind

MirrorMind is a full-stack MVP for reflective journaling and AI-guided self-awareness. It helps users capture thoughts, moods, and themes, then turns those entries into grounded summaries, pattern hints, follow-up questions, and simple action suggestions.

## Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy
- Database: SQLite locally, Postgres-ready in production
- AI: OpenAI API with a local fallback mode when no key is present

## Product flow

- Landing page with a clear value proposition
- Simple sign-in using a seeded demo user
- Dashboard with recent entries, weekly summary, patterns, and mood trend chart
- New entry flow with mood and tags
- History page with filtering by mood and tag
- Insights page with weekly summary and change notes

## Project structure

```text
MirrorMind/
├─ frontend/
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  └─ .env.example
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ db/
│  │  ├─ models/
│  │  ├─ schemas/
│  │  └─ services/
│  ├─ scripts/
│  ├─ .env.example
│  └─ requirements.txt
└─ README.md
```

## Local setup

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m app.main
```

Run the API with:

```bash
uvicorn app.main:app --reload --port 8000
```

Seed demo data:

```bash
python scripts/seed.py
```

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

The frontend expects the backend at `http://127.0.0.1:8000`.

## Demo credentials

- Email: `demo@mirrormind.app`
- Password: `demo123`

## Environment variables

### Backend

- `OPENAI_API_KEY`: optional, enables richer AI reflections
- `OPENAI_MODEL`: defaults to `gpt-4.1-mini`
- `DATABASE_URL`: SQLite locally or Postgres/Neon in production
- `SESSION_SECRET`: used to sign auth sessions
- `CORS_ORIGINS`: JSON array of allowed frontend origins
- `DEMO_USER_EMAIL`
- `DEMO_USER_PASSWORD`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`: backend API base URL

## API overview

- `POST /api/auth/login`
- `GET /entries?user_id=1`
- `POST /entries`
- `GET /entries/{entry_id}`
- `GET /patterns?user_id=1`
- `GET /insights/dashboard?user_id=1`

## Notes

- MirrorMind is intentionally framed as a self-reflection tool, not therapy or diagnosis.
- If no OpenAI key is configured, the backend still works using a local fallback reflection generator.
- The seed script creates realistic sample data for a fast two-minute demo.
- For Vercel, the root [vercel.json](C:\Users\ramne\OneDrive\Desktop\AI Self-Awareness Coach\vercel.json) mounts the Next.js frontend at `/` and the FastAPI backend at `/api`.
- The backend now accepts standard `postgres://` and `postgresql://` URLs and normalizes them for SQLAlchemy, so switching to Neon mainly becomes a `DATABASE_URL` change plus dependency install.
