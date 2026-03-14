from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import create_user, get_user_by_email
from app.core.security import verify_password, create_access_token
from app.utils.response import success_response

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new user with email + password.
    Returns the created user and a JWT access token.
    """
    user = create_user(db, data)
    token = create_access_token(subject=user.id, extra_data={"role": user.role.value})
    return success_response(
        data={"user": UserResponse.model_validate(user), "access_token": token},
        message="Registration successful",
    )


@router.post("/login")
def login(data: UserCreate, db: Session = Depends(get_db)):
    """
    Authenticates user with email + password.
    Returns a fresh JWT token on success.
    """
    user = get_user_by_email(db, data.email)

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(data.password or "", user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    token = create_access_token(subject=user.id, extra_data={"role": user.role.value})
    return success_response(
        data={"user": UserResponse.model_validate(user), "access_token": token},
        message="Login successful",
    )