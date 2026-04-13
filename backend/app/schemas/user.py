import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


# ─── Base ───────────────────────────────────────────────────
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    role: UserRole = UserRole.freelancer
    is_onboarded: bool = False


# ─── Create (Registration) ──────────────────────────────────
class UserCreate(UserBase):
    # Password is optional — users logging in via Clerk won't need it
    password: str


# ─── Update ─────────────────────────────────────────────────
class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    role: UserRole | None = None
    is_onboarded: bool | None = None
    is_active: bool | None = None


# ─── Response (what API returns) ────────────────────────────
class UserResponse(UserBase):
    id: uuid.UUID
    clerk_id: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Short version for nesting inside other responses ───────
class UserShort(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: UserRole

    model_config = {"from_attributes": True}