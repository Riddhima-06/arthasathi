from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import engine
from app.database import get_db
from app.deps import current_user
from app.models import User
from app.schemas import ChatIn, ChatOut

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/status")
async def status(_: User = Depends(current_user)):
    return {"mode": "llm" if engine.llm_available() else "offline"}


@router.post("/chat", response_model=ChatOut)
async def chat(body: ChatIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    try:
        reply, trace, mode = await engine.chat(body.message, user, db)
    except HTTPException:
        raise
    except Exception as exc:  # LLM/network failures shouldn't surface as a bare 500
        raise HTTPException(502, f"The advisor model is unavailable right now ({type(exc).__name__}). Try again in a moment.")
    return ChatOut(reply=reply, trace=trace, mode=mode)
