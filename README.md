# ArthaSathi

AI-powered business advisory and concessional lending engine (SIH 2026, SIH26091, Ministry of Social Justice and Empowerment).

## Run everything
```bash
cp .env.example .env        # optional: add GOOGLE_API_KEY or ANTHROPIC_API_KEY for the LLM advisor
docker compose up --build
```
Frontend http://localhost:3000 · API docs http://localhost:8000/docs

Demo logins (password `demo1234`): borrower `9000000001` (approved loan), field officer `9000000099` (Nadia district).

Without an LLM key the advisor answers in a rule-based "offline" mode that calls the same tools.

## Run pieces separately
```bash
docker compose up -d db                                   # runs database/01..04 on first start
cd backend && pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://arthasathi:arthasathi@localhost:5432/arthasathi
uvicorn app.main:app --reload                             # API on :8000
python -m tests.smoke_test                                # end-to-end checks (re-runnable)
cd ../frontend && npm install && npm run dev              # UI on :3000
```
Re-initialise the database: `docker compose down -v && docker compose up -d db`.
