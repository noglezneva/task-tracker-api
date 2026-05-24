from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DBSessionDep
from app.core.security import get_password_hash, verify_password, create_access_token
from app.repositories import UserRepository
from app.schemas.auth import RegisterRequest, TokenResponse


router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=TokenResponse)
async def register(data: RegisterRequest, db: DBSessionDep) -> TokenResponse:
    user_repo = UserRepository(db)
    existing_user = await user_repo.get_by_email(data.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = await user_repo.create(email=data.email, hashed_password=get_password_hash(data.password))

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: DBSessionDep = None) -> TokenResponse:
    user = await UserRepository(db).get_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)