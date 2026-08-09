from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


DBSessionDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


async def get_current_user(db: DBSessionDep, token: TokenDep) -> User:
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")

        if not isinstance(user_id_str, str):
            raise TypeError("Invalid token payload")

        user_id = UUID(user_id_str)

    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from exc

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]
