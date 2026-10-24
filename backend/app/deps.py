import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User

bearer = HTTPBearer(auto_error=False)


async def hash_password(pw: str) -> str:
    return (await asyncio.to_thread(bcrypt.hashpw, pw.encode(), bcrypt.gensalt(10))).decode()


async def verify_password(pw: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return await asyncio.to_thread(bcrypt.checkpw, pw.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: uuid.UUID) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.token_minutes)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: AsyncSession = Depends(get_db)
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to continue.", headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise unauthorized
    try:
        sub = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])["sub"]
        user = await db.get(User, uuid.UUID(sub))
    except (JWTError, ValueError, KeyError):
        raise unauthorized
    if user is None:
        raise unauthorized
    return user


async def officer_user(user: User = Depends(current_user)) -> User:
    if user.role not in ("FIELD_OFFICER", "ADMIN"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only field officers can do this.")
    return user
