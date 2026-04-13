import urllib.request
import json
import uuid
import sys
from typing import Any
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db

# ─── Password Validation (Kept for backwards compat if needed) ───
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ─── Clerk JWT Verification ─────────────────────────────────

jwks_cache = {}

def get_jwks(issuer: str) -> dict:
    if issuer in jwks_cache:
        return jwks_cache[issuer]
    try:
        jwks_url = f"{issuer}/.well-known/jwks.json"
        req = urllib.request.Request(jwks_url)
        with urllib.request.urlopen(req) as response:
            jwks = json.loads(response.read().decode())
            jwks_cache[issuer] = jwks
            return jwks
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not fetch auth keys")

def decode_clerk_token(token: str) -> dict:
    try:
        unverified_claims = jwt.get_unverified_claims(token)
        issuer = unverified_claims.get("iss")
        if not issuer:
            raise JWTError("Missing issuer in token")
        
        jwks = get_jwks(issuer)
        
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── FastAPI Dependency ─────────────────────────────────────
bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    from app.services.user_service import get_user_by_clerk_id, get_user_by_email
    from app.models.user import User, UserRole
    
    # 1. Decode Clerk Token
    payload = decode_clerk_token(credentials.credentials)
    clerk_id = payload.get("sub")
    
    if not clerk_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # 2. Extract User Metadata from token
    clerk_metadata = payload.get("public_metadata") or payload.get("publicMetadata", {})
    email = payload.get("email") or clerk_metadata.get("email") or f"{clerk_id}@clerk-managed.com"
    name = payload.get("name") or payload.get("first_name", "Clerk User")

    # 3. Look up user — clerk_id is the PRIMARY identity key
    user = get_user_by_clerk_id(db, clerk_id)

    if user:
        # ──────────────────────────────────────────────────────
        # EXISTING USER — just return them. 
        # NEVER touch their role. DB is the source of truth.
        # ──────────────────────────────────────────────────────
        
        # Only sync non-sensitive metadata (name/email) if changed
        dirty = False
        if user.email != email and email and "@clerk-managed.com" not in email:
            # Check no other user owns this email already
            existing_email_user = get_user_by_email(db, email)
            if not existing_email_user or existing_email_user.id == user.id:
                user.email = email
                dirty = True
        if user.full_name != name and name and name != "Clerk User":
            user.full_name = name
            dirty = True
        
        if dirty:
            db.commit()
            db.refresh(user)
            
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
        
        return user

    # 4. NEW USER — first-time login via Clerk
    #    They get a temporary "client" role. The onboarding page
    #    lets them pick their real role before they can proceed.
    #    
    #    CRITICAL: We also check if a user with this email already
    #    exists (e.g. created via a different auth method). If so,
    #    we link the clerk_id to the existing user instead of 
    #    creating a duplicate.
    existing_email_user = get_user_by_email(db, email)
    if existing_email_user:
        # Link this Clerk identity to the existing DB user
        existing_email_user.clerk_id = clerk_id
        if existing_email_user.full_name == "Clerk User" and name != "Clerk User":
            existing_email_user.full_name = name
        db.commit()
        db.refresh(existing_email_user)
        return existing_email_user

    # 5. Truly new user — create with is_onboarded=False
    #    Role defaults to "client" but will be overwritten
    #    during onboarding BEFORE they reach the dashboard.
    user = User(
        clerk_id=clerk_id,
        email=email,
        full_name=name,
        role=UserRole.client,      # Temporary — set properly in onboarding
        is_active=True,
        is_verified=True,
        is_onboarded=False,        # Forces onboarding flow
    )
    db.add(user)
    db.commit()
    db.refresh(user)

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