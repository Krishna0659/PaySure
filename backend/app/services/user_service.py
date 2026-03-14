import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User:
    """Fetches a user by their UUID, raises 404 if not found."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    """Returns user by email or None — used during login and registration checks."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_clerk_id(db: Session, clerk_id: str) -> User | None:
    """Looks up a user by their Clerk auth ID — used in JWT middleware."""
    return db.query(User).filter(User.clerk_id == clerk_id).first()


def create_user(db: Session, data: UserCreate, clerk_id: str | None = None) -> User:
    """
    Creates a new user. Checks for duplicate email first.
    Hashes password if provided (non-Clerk users).
    """
    if get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    hashed = hash_password(data.password) if data.password else None

    user = User(
        full_name=data.full_name,
        email=data.email,
        role=data.role,
        hashed_password=hashed,
        clerk_id=clerk_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: uuid.UUID, data: UserUpdate) -> User:
    """Updates allowed user fields — only modifies fields that are provided."""
    user = get_user_by_id(db, user_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def get_all_users(db: Session, skip: int = 0, limit: int = 50) -> list[User]:
    """Returns paginated list of all users — admin only use."""
    return db.query(User).offset(skip).limit(limit).all()