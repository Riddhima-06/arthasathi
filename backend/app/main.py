from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.config import settings
from app.routers import advisory, agent, auth, loans

app = FastAPI(title="ArthaSathi API", version="1.0.0")

app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
for r in (auth.router, advisory.router, loans.router, agent.router):
    app.include_router(r)


def _first_line(exc: DBAPIError) -> str:
    msg = str(exc.orig).splitlines()[0] if exc.orig else "Database rejected the change."
    return msg.split(": ", 1)[-1] if msg.startswith("<class") else msg


@app.exception_handler(IntegrityError)
async def integrity_handler(_: Request, exc: IntegrityError):
    return JSONResponse(status_code=409, content={"detail": "That record conflicts with existing data."})


@app.exception_handler(DBAPIError)
async def db_rule_handler(_: Request, exc: DBAPIError):
    """Surface statutory rules enforced by DB triggers (e.g. the 90% ceiling) as 422, not 500."""
    msg = _first_line(exc)
    if "Minimum 10%" in msg or "check_violation" in msg:
        return JSONResponse(status_code=422, content={"detail": msg})
    return JSONResponse(status_code=500, content={"detail": "Database error."})


@app.get("/health")
async def health():
    return {"status": "ok"}
