import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db

# ─── Password Hashing ───────────────────────────────────────
# CryptContext handles hashing and verification using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hashes a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compares a plain password against its stored bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT Token ──────────────────────────────────────────────
def create_access_token(subject: str | uuid.UUID, extra_data: dict[str, Any] | None = None) -> str:
    """
    Creates a signed JWT token with expiry.
    subject = user ID, extra_data = any additional claims (e.g. role).
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra_data:
        payload.update(extra_data)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decodes and validates a JWT token.
    Raises 401 if token is expired, tampered, or invalid.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── FastAPI Dependency ─────────────────────────────────────
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    FastAPI dependency — extracts and validates the Bearer token,
    then returns the matching User from the database.
    Usage: current_user = Depends(get_current_user)
    """
    from app.services.user_service import get_user_by_id

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = get_user_by_id(db, uuid.UUID(user_id))

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    return user


def require_role(*roles):
    """
    Role-based access control dependency factory.
    Usage: Depends(require_role("admin")) or Depends(require_role("admin", "client"))
    """
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to: {', '.join(roles)}",
            )
        return current_user
    return role_checker