from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import create_token, current_user, hash_password, verify_password
from app.models import User
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(User.id).where(User.mobile == body.mobile)):
        raise HTTPException(status.HTTP_409_CONFLICT, "This mobile number is already registered. Sign in instead.")
    data = body.model_dump(exclude={"password"})
    user = User(**data, password_hash=await hash_password(body.password), role="BENEFICIARY")
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.mobile == body.mobile))
    # Same error for unknown number and wrong password, so numbers can't be probed.
    if user is None or not await verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Mobile number or password is incorrect.")
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user
